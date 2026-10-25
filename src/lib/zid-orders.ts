import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fetchZidOrder } from "@/lib/zid-api";
import { extractZidOrder, mapZidOrder, type ZidMappedOrder, type ZidOrderPayload } from "@/lib/zid";

function generateProofToken(): string {
  return `pt_${randomBytes(16).toString("hex")}`;
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

// Creates or updates a Zid order keyed by (source, externalOrderId). Items are
// written once when the order is first seen; later updates only refresh order
// fields, since item replacement would need deleteMany (forbidden by SAFETY_RULES).
export async function upsertZidOrder(
  mapped: ZidMappedOrder
): Promise<{ orderId: string; created: boolean }> {
  const where = {
    source_externalOrderId: { source: "ZID" as const, externalOrderId: mapped.externalOrderId },
  };

  const fields = {
    orderNumber: mapped.orderNumber,
    customerName: mapped.customerName,
    customerMobile: mapped.customerMobile,
    customerEmail: mapped.customerEmail,
    orderDate: mapped.orderDate,
    amount: mapped.amount,
    currency: mapped.currency,
    storeStatus: mapped.storeStatus,
  };

  // Two deliveries of the same order can race; the unique index rejects the
  // second insert, and the retry then takes the update path.
  for (let attempt = 0; ; attempt++) {
    try {
      const existing = await prisma.order.findUnique({
        where,
        select: { id: true, _count: { select: { items: true } } },
      });

      if (existing) {
        await prisma.order.update({
          where: { id: existing.id },
          data: {
            ...fields,
            items:
              existing._count.items === 0 && mapped.items.length > 0
                ? { createMany: { data: mapped.items } }
                : undefined,
          },
        });
        return { orderId: existing.id, created: false };
      }

      const order = await prisma.order.create({
        data: {
          source: "ZID",
          externalOrderId: mapped.externalOrderId,
          ...fields,
          proofStatus: "PENDING",
          proofToken: generateProofToken(),
          items: mapped.items.length > 0 ? { create: mapped.items } : undefined,
        },
        select: { id: true },
      });
      return { orderId: order.id, created: true };
    } catch (error) {
      if (attempt === 0 && isUniqueViolation(error)) continue;
      throw error;
    }
  }
}

async function finishEvent(
  eventId: string,
  data: { status: "PROCESSED" | "SKIPPED" | "FAILED"; error?: string; orderId?: string }
) {
  await prisma.webhookEvent.update({
    where: { id: eventId },
    data: {
      status: data.status,
      error: data.error?.slice(0, 1000) ?? null,
      orderId: data.orderId,
      processedAt: new Date(),
    },
  });
}

export async function processZidWebhookEvent(eventId: string): Promise<void> {
  const event = await prisma.webhookEvent.update({
    where: { id: eventId },
    data: { attempts: { increment: 1 } },
  });

  if (event.status === "PROCESSED") return;

  try {
    const payloadOrder = extractZidOrder(event.payload);
    if (!payloadOrder) {
      await finishEvent(eventId, { status: "FAILED", error: "Payload has no order id" });
      return;
    }

    const externalId = String(payloadOrder.id);
    const connection = event.storeId
      ? await prisma.zidConnection.findUnique({ where: { storeId: event.storeId } })
      : await prisma.zidConnection.findFirst();

    let order: ZidOrderPayload | null;
    if (connection) {
      order = await fetchZidOrder(connection, externalId);
      if (!order) {
        await finishEvent(eventId, { status: "FAILED", error: `Order ${externalId} not found in Zid API` });
        return;
      }
    } else if (process.env.ZID_TRUST_WEBHOOK_PAYLOAD === "true") {
      order = payloadOrder;
    } else {
      await finishEvent(eventId, {
        status: "SKIPPED",
        error: `No Zid connection for store ${event.storeId ?? "unknown"}`,
      });
      return;
    }

    const { orderId } = await upsertZidOrder(mapZidOrder(order));
    await finishEvent(eventId, { status: "PROCESSED", orderId });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("ZID_WEBHOOK_PROCESS_FAILED", { eventId, error: message });
    await finishEvent(eventId, { status: "FAILED", error: message });
  }
}
