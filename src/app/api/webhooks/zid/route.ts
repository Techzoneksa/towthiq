import { NextRequest, NextResponse, after } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { extractZidOrder } from "@/lib/zid";
import { processZidWebhookEvent } from "@/lib/zid-orders";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

// Zid does not sign webhook payloads; the only sender check it offers is the
// Basic Auth credentials we register with each subscription.
function isAuthorized(request: NextRequest, username: string, password: string): boolean {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Basic ")) return false;

  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const separator = decoded.indexOf(":");
  if (separator === -1) return false;

  const user = decoded.slice(0, separator);
  const pass = decoded.slice(separator + 1);
  return safeEqual(user, username) && safeEqual(pass, password);
}

export async function POST(request: NextRequest) {
  const username = process.env.ZID_WEBHOOK_USERNAME || "";
  const password = process.env.ZID_WEBHOOK_PASSWORD || "";

  if (!username || !password) {
    console.error("ZID_WEBHOOK_NOT_CONFIGURED");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  if (!isAuthorized(request, username, password)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // The event name is part of the target_url we register for each
  // subscription, e.g. /api/webhooks/zid?event=order.create
  const event = request.nextUrl.searchParams.get("event") || "unknown";
  const rawBody = await request.text();

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const order = extractZidOrder(body);
  const payloadHash = createHash("sha256").update(`${event}\n${rawBody}`).digest("hex");

  let eventId: string;
  try {
    const created = await prisma.webhookEvent.create({
      data: {
        provider: "ZID",
        event,
        storeId: order?.store_id != null ? String(order.store_id) : null,
        externalId: order ? String(order.id) : null,
        payloadHash,
        payload: body as Prisma.InputJsonValue,
      },
      select: { id: true },
    });
    eventId = created.id;
  } catch (error) {
    // Zid retried a delivery we already stored.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error("ZID_WEBHOOK_STORE_FAILED", {
      event,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Failed to store event" }, { status: 500 });
  }

  // Acknowledge immediately and do the Zid API call + upsert after responding.
  after(() => processZidWebhookEvent(eventId));

  return NextResponse.json({ received: true });
}
