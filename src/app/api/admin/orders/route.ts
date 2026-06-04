import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const orderNumber = searchParams.get("orderNumber") || "";
  const mobile = searchParams.get("mobile") || "";
  const email = searchParams.get("email") || "";
  const proofStatus = searchParams.get("proofStatus") || "";
  const source = searchParams.get("source") || "";

  const where: Prisma.OrderWhereInput = {};

  if (orderNumber) {
    where.orderNumber = { contains: orderNumber };
  }
  if (mobile) {
    where.customerMobile = { contains: mobile };
  }
  if (email) {
    where.customerEmail = { contains: email };
  }
  if (proofStatus) {
    where.proofStatus = proofStatus as any;
  }
  if (source) {
    where.source = source as any;
  }

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        source: true,
        orderNumber: true,
        customerName: true,
        customerMobile: true,
        customerEmail: true,
        proofStatus: true,
        storeStatus: true,
        orderDate: true,
        createdAt: true,
        proofToken: true,
        _count: {
          select: {
            proofFiles: true,
          },
        },
        proofFiles: {
          select: {
            type: true,
          },
        },
      },
    }),
  ]);

  const formattedOrders = orders.map((order) => {
    const videosCount = order.proofFiles.filter(
      (f) => f.type === "VIDEO"
    ).length;
    const imagesCount = order.proofFiles.filter(
      (f) => f.type === "IMAGE"
    ).length;

    return {
      id: order.id,
      source: order.source,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerMobile: order.customerMobile,
      customerEmail: order.customerEmail,
      proofStatus: order.proofStatus,
      storeStatus: order.storeStatus,
      orderDate: order.orderDate,
      createdAt: order.createdAt,
      proofToken: order.proofToken,
      filesCount: order._count.proofFiles,
      videosCount,
      imagesCount,
    };
  });

  const totalPages = Math.ceil(total / limit);

  return NextResponse.json({
    orders: formattedOrders,
    total,
    page,
    limit,
    totalPages,
  });
}