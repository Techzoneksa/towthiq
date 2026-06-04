import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ARABIC_DIGITS: Record<string, string> = {
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
};

function normalizeArabicDigits(input: string): string {
  return input.replace(/[٠-٩]/g, (d) => ARABIC_DIGITS[d] || d);
}

function normalizeMobile(mobile: string): string[] {
  let cleaned = mobile.replace(/[\s\-+]/g, "");
  cleaned = normalizeArabicDigits(cleaned);

  const variants: string[] = [];

  if (cleaned.startsWith("00")) {
    cleaned = cleaned.replace(/^00/, "");
  }

  if (cleaned.startsWith("+")) {
    cleaned = cleaned.slice(1);
  }

  const base = cleaned;

  if (base.length === 9 && base.startsWith("5")) {
    variants.push(base);
    variants.push("0" + base);
    variants.push("966" + base);
  } else if (base.length === 10 && base.startsWith("05")) {
    variants.push(base);
    variants.push(base.slice(1));
    variants.push("966" + base.slice(1));
  } else if (base.length === 12 && base.startsWith("966")) {
    variants.push(base);
    variants.push(base.slice(3));
    if (base.slice(3).startsWith("0")) {
      variants.push(base.slice(3));
    } else {
      variants.push("0" + base.slice(3));
    }
  } else {
    variants.push(base);
  }

  return [...new Set(variants)];
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const searchType = searchParams.get("searchType") || "";
  const mobile = searchParams.get("mobile") || "";
  const email = searchParams.get("email") || "";

  if (!searchType || (searchType !== "mobile" && searchType !== "email")) {
    return NextResponse.json(
      { error: "Invalid search type" },
      { status: 400 }
    );
  }

  if (searchType === "mobile" && !mobile) {
    return NextResponse.json(
      { error: "Mobile number is required" },
      { status: 400 }
    );
  }

  if (searchType === "email") {
    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json(
        { error: "البريد الإلكتروني غير صحيح" },
        { status: 400 }
      );
    }

    const orders = await prisma.order.findMany({
      where: { customerEmail: normalizedEmail },
      orderBy: { createdAt: "desc" },
      select: {
        orderNumber: true,
        customerName: true,
        orderDate: true,
        proofStatus: true,
        proofToken: true,
        proofFiles: {
          select: {
            type: true,
          },
        },
      },
    });

    const formattedOrders = orders.map((order) => {
      const videosCount = order.proofFiles.filter((f) => f.type === "VIDEO").length;
      const imagesCount = order.proofFiles.filter((f) => f.type === "IMAGE").length;
      return {
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        orderDate: order.orderDate,
        proofStatus: order.proofStatus,
        proofToken: order.proofToken,
        filesCount: order.proofFiles.length,
        videosCount,
        imagesCount,
        hasMedia: order.proofFiles.length > 0,
      };
    });

    return NextResponse.json({ orders: formattedOrders });
  }

  if (searchType === "mobile") {
    const variants = normalizeMobile(mobile);

    const orders = await prisma.order.findMany({
      where: {
        customerMobile: { in: variants },
      },
      orderBy: { createdAt: "desc" },
      select: {
        orderNumber: true,
        customerName: true,
        orderDate: true,
        proofStatus: true,
        proofToken: true,
        proofFiles: {
          select: {
            type: true,
          },
        },
      },
    });

    const formattedOrders = orders.map((order) => {
      const videosCount = order.proofFiles.filter((f) => f.type === "VIDEO").length;
      const imagesCount = order.proofFiles.filter((f) => f.type === "IMAGE").length;
      return {
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        orderDate: order.orderDate,
        proofStatus: order.proofStatus,
        proofToken: order.proofToken,
        filesCount: order.proofFiles.length,
        videosCount,
        imagesCount,
        hasMedia: order.proofFiles.length > 0,
      };
    });

    return NextResponse.json({ orders: formattedOrders });
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { searchType, mobile, email, countryCode } = body;

  if (!searchType || (searchType !== "mobile" && searchType !== "email")) {
    return NextResponse.json(
      { error: "Invalid search type" },
      { status: 400 }
    );
  }

  if (searchType === "mobile") {
    if (!mobile) {
      return NextResponse.json(
        { error: "Mobile number is required" },
        { status: 400 }
      );
    }

    const variants = normalizeMobile(mobile);

    const orders = await prisma.order.findMany({
      where: {
        customerMobile: { in: variants },
      },
      orderBy: { createdAt: "desc" },
      select: {
        orderNumber: true,
        customerName: true,
        orderDate: true,
        proofStatus: true,
        proofToken: true,
        proofFiles: {
          select: {
            type: true,
          },
        },
      },
    });

    const formattedOrders = orders.map((order) => {
      const videosCount = order.proofFiles.filter((f) => f.type === "VIDEO").length;
      const imagesCount = order.proofFiles.filter((f) => f.type === "IMAGE").length;
      return {
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        orderDate: order.orderDate,
        proofStatus: order.proofStatus,
        proofToken: order.proofToken,
        filesCount: order.proofFiles.length,
        videosCount,
        imagesCount,
        hasMedia: order.proofFiles.length > 0,
      };
    });

    return NextResponse.json({ orders: formattedOrders });
  }

  if (searchType === "email") {
    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json(
        { error: "البريد الإلكتروني غير صحيح" },
        { status: 400 }
      );
    }

    const orders = await prisma.order.findMany({
      where: { customerEmail: normalizedEmail },
      orderBy: { createdAt: "desc" },
      select: {
        orderNumber: true,
        customerName: true,
        orderDate: true,
        proofStatus: true,
        proofToken: true,
        proofFiles: {
          select: {
            type: true,
          },
        },
      },
    });

    const formattedOrders = orders.map((order) => {
      const videosCount = order.proofFiles.filter((f) => f.type === "VIDEO").length;
      const imagesCount = order.proofFiles.filter((f) => f.type === "IMAGE").length;
      return {
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        orderDate: order.orderDate,
        proofStatus: order.proofStatus,
        proofToken: order.proofToken,
        filesCount: order.proofFiles.length,
        videosCount,
        imagesCount,
        hasMedia: order.proofFiles.length > 0,
      };
    });

    return NextResponse.json({ orders: formattedOrders });
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}