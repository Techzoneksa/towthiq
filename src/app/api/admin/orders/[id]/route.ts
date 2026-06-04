import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      proofFiles: {
        select: {
          id: true,
          type: true,
          fileName: true,
          mimeType: true,
          size: true,
          sortOrder: true,
          createdAt: true,
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({ order });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const allowedFields: Record<string, unknown> = {};
  if (body.proofStatus !== undefined) allowedFields.proofStatus = body.proofStatus;
  if (body.customerName !== undefined) allowedFields.customerName = body.customerName;
  if (body.customerMobile !== undefined) allowedFields.customerMobile = body.customerMobile;
  if (body.customerEmail !== undefined) allowedFields.customerEmail = body.customerEmail;
  if (body.notes !== undefined) allowedFields.notes = body.notes;

  try {
    const order = await prisma.order.update({
      where: { id },
      data: allowedFields,
    });
    return NextResponse.json({ order });
  } catch {
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}