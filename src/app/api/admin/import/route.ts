import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { detectAndParse, getPreviewRows, ParsedOrder } from "@/lib/import-helpers";
import { OrderSource } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const action = formData.get("action") as string;

  if (action === "preview") {
    const file = formData.get("file") as File | null;
    const source = formData.get("source") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!source || !["SALLA", "SHOPIFY"].includes(source)) {
      return NextResponse.json({ error: "Invalid source" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name;

    try {
      const result = getPreviewRows(buffer, fileName, source as "SALLA" | "SHOPIFY", 20);
      return NextResponse.json({
        previewRows: result.previewRows,
        detectedColumns: result.detectedColumns,
        totalRows: result.totalRows,
        fileName,
      });
    } catch (error) {
      return NextResponse.json(
        { error: "Failed to parse file", details: String(error) },
        { status: 500 }
      );
    }
  }

  if (action === "commit") {
    const file = formData.get("file") as File | null;
    const source = formData.get("source") as string;

    if (!file || !source) {
      return NextResponse.json({ error: "Missing file or source" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name;

    try {
      const { orders, errors: parseErrors } = detectAndParse(
        buffer,
        fileName,
        source as "SALLA" | "SHOPIFY"
      );

      let successCount = 0;
      let updatedCount = 0;
      const failedErrors: Array<{ rowNumber: number; reason: string; rawData: Record<string, unknown> }> = [...parseErrors];

      for (const order of orders) {
        try {
          const existing = await prisma.order.findFirst({
            where: {
              source: source as OrderSource,
              orderNumber: order.orderNumber,
            },
          });

          if (existing) {
            await prisma.order.update({
              where: { id: existing.id },
              data: {
                customerName: order.customerName,
                customerMobile: order.customerMobile,
                customerEmail: order.customerEmail,
                orderDate: order.orderDate ? new Date(order.orderDate) : undefined,
                amount: order.amount ? parseFloat(order.amount) : undefined,
                storeStatus: order.storeStatus,
              },
            });

            if (order.items.length > 0) {
              await prisma.orderItem.deleteMany({
                where: { orderId: existing.id },
              });

              await prisma.orderItem.createMany({
                data: order.items.map((item) => ({
                  orderId: existing.id,
                  name: item.name,
                  quantity: item.quantity,
                  price: item.price ? parseFloat(item.price) : undefined,
                  sku: item.sku,
                })),
              });
            }

            updatedCount++;
          } else {
            await prisma.order.create({
              data: {
                source: source as OrderSource,
                orderNumber: order.orderNumber,
                customerName: order.customerName,
                customerMobile: order.customerMobile,
                customerEmail: order.customerEmail,
                orderDate: order.orderDate ? new Date(order.orderDate) : undefined,
                amount: order.amount ? parseFloat(order.amount) : undefined,
                currency: "SAR",
                storeStatus: order.storeStatus,
                proofStatus: "PENDING",
                proofToken: `pt_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
                items: order.items.length > 0
                  ? {
                      create: order.items.map((item) => ({
                        name: item.name,
                        quantity: item.quantity,
                        price: item.price ? parseFloat(item.price) : undefined,
                        sku: item.sku,
                      })),
                    }
                  : undefined,
              },
            });

            successCount++;
          }
        } catch (err) {
          failedErrors.push({
            rowNumber: order.rowNumber,
            reason: `خطأ في قاعدة البيانات: ${String(err)}`,
            rawData: order.rawData,
          });
        }
      }

      const importBatch = await prisma.importBatch.create({
        data: {
          source: source as OrderSource,
          fileName,
          totalRows: orders.length + parseErrors.length,
          successRows: successCount,
          failedRows: failedErrors.length,
          status: failedErrors.length > 0 ? "PARTIAL" : "COMPLETED",
          createdById: (session.user as { id?: string }).id,
        },
      });

      if (failedErrors.length > 0) {
        await prisma.importError.createMany({
          data: failedErrors.map((err) => ({
            importBatchId: importBatch.id,
            rowNumber: err.rowNumber,
            reason: err.reason,
            rawData: err.rawData as any,
          })),
        });
      }

      return NextResponse.json({
        success: true,
        totalRows: orders.length + parseErrors.length,
        added: successCount,
        updated: updatedCount,
        failed: failedErrors.length,
        errors: failedErrors.slice(0, 50),
        batchId: importBatch.id,
      });
    } catch (error) {
      return NextResponse.json(
        { error: "Failed to import", details: String(error) },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}