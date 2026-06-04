import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 100 * 1024 * 1024;
const MAX_FILES = 100;
const MAX_PREVIEW_LINES = 20;

const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_EXTENSIONS: Record<string, string> = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

interface UploadResult {
  fileName: string;
  orderNumber: string | null;
  status: "success" | "failed";
  reason?: string;
}

function extractOrderNumber(fileName: string): string | null {
  const baseName = fileName.replace(/\.[^/.]+$/, "");

  const reversed = baseName.split("").reverse().join("");
  const match = reversed.match(/^(\d{5,})/);

  if (match) {
    return match[1].split("").reverse().join("");
  }

  const normalMatch = baseName.match(/(\d{5,})/);
  if (normalMatch) {
    return normalMatch[1];
  }

  return null;
}

function getFileType(file: File): "VIDEO" | "IMAGE" | null {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const mimeFromExt = ALLOWED_EXTENSIONS[ext];

  if (mimeFromExt) {
    if (["video/mp4", "video/quicktime", "video/webm"].includes(mimeFromExt)) {
      return "VIDEO";
    }
    if (["image/jpeg", "image/png", "image/webp"].includes(mimeFromExt)) {
      return "IMAGE";
    }
  }

  if (ALLOWED_VIDEO_TYPES.includes(file.type)) return "VIDEO";
  if (ALLOWED_IMAGE_TYPES.includes(file.type)) return "IMAGE";

  return null;
}

function getMimeType(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  return ALLOWED_EXTENSIONS[ext] || "application/octet-stream";
}

function getStorageKey(
  orderNumber: string,
  type: "VIDEO" | "IMAGE",
  fileName: string
): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const timestamp = Date.now();
  const folder = type === "VIDEO" ? "videos" : "images";
  return `proofs/${orderNumber}/${folder}/${timestamp}-${safeName}`;
}

function createR2Client(): S3Client | null {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const files = formData.getAll("files") as File[];

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  if (files.length > MAX_FILES) {
    return NextResponse.json(
      { error: `Maximum ${MAX_FILES} files per batch` },
      { status: 400 }
    );
  }

  const client = createR2Client();
  if (!client) {
    return NextResponse.json(
      {
        total: files.length,
        success: 0,
        failed: files.length,
        videos: 0,
        images: 0,
        results: files.map((f) => ({
          fileName: f.name,
          orderNumber: null,
          status: "failed",
          reason: "إعدادات التخزين غير مكتملة",
        })),
      },
      { status: 200 }
    );
  }

  const bucket = process.env.CLOUDFLARE_R2_BUCKET || "";
  const results: UploadResult[] = [];
  let successCount = 0;
  let failedCount = 0;
  let videosCount = 0;
  let imagesCount = 0;

  for (const file of files) {
    const fileName = file.name;
    const ext = fileName.split(".").pop()?.toLowerCase() || "";

    if (!ALLOWED_EXTENSIONS[ext]) {
      results.push({
        fileName,
        orderNumber: null,
        status: "failed",
        reason: "نوع الملف غير مدعوم",
      });
      failedCount++;
      continue;
    }

    if (file.size > MAX_FILE_SIZE) {
      results.push({
        fileName,
        orderNumber: null,
        status: "failed",
        reason: `حجم الملف أكبر من الحد المسموح 100MB`,
      });
      failedCount++;
      continue;
    }

    const orderNumber = extractOrderNumber(fileName);
    if (!orderNumber) {
      results.push({
        fileName,
        orderNumber: null,
        status: "failed",
        reason: `اسم الملف غير صحيح. استخدم مثل: 262190392.mp4`,
      });
      failedCount++;
      continue;
    }

    const order = await prisma.order.findFirst({
      where: { orderNumber },
    });

    if (!order) {
      results.push({
        fileName,
        orderNumber,
        status: "failed",
        reason: "لم يتم العثور على طلب مطابق لرقم الطلب في اسم الملف",
      });
      failedCount++;
      continue;
    }

    const fileType = getFileType(file);
    if (!fileType) {
      results.push({
        fileName,
        orderNumber,
        status: "failed",
        reason: "نوع الملف غير مدعوم",
      });
      failedCount++;
      continue;
    }

    const mimeType = getMimeType(file);
    const storageKey = getStorageKey(orderNumber, fileType, fileName);

    try {
      const buffer = Buffer.from(await file.arrayBuffer());

      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: storageKey,
          Body: buffer,
          ContentType: mimeType,
        })
      );
    } catch (r2Error) {
      results.push({
        fileName,
        orderNumber,
        status: "failed",
        reason: "فشل رفع الملف إلى التخزين",
      });
      failedCount++;
      continue;
    }

    try {
      await prisma.proofFile.create({
        data: {
          orderId: order.id,
          type: fileType,
          storageKey,
          fileName,
          mimeType,
          size: file.size,
          sortOrder: 0,
          uploadedById: (session.user as { id?: string }).id,
        },
      });
    } catch (dbError) {
      results.push({
        fileName,
        orderNumber,
        status: "failed",
        reason: "تم رفع الملف للتخزين لكن فشل حفظ سجل الملف في قاعدة البيانات",
      });
      failedCount++;
      continue;
    }

    if (order.proofStatus === "PENDING" || order.proofStatus === "IN_PROGRESS") {
      try {
        await prisma.order.update({
          where: { id: order.id },
          data: { proofStatus: "READY" },
        });
      } catch {
        // Non-critical, continue
      }
    }

    if (fileType === "VIDEO") videosCount++;
    if (fileType === "IMAGE") imagesCount++;

    results.push({
      fileName,
      orderNumber,
      status: "success",
    });
    successCount++;
  }

  return NextResponse.json({
    total: files.length,
    success: successCount,
    failed: failedCount,
    videos: videosCount,
    images: imagesCount,
    results,
  });
}