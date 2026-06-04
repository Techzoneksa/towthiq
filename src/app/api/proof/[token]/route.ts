import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  S3Client,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getSignedUrlFromR2 } from "@/lib/r2";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const order = await prisma.order.findUnique({
    where: { proofToken: token },
    include: {
      proofFiles: {
        select: {
          id: true,
          type: true,
          fileName: true,
          mimeType: true,
          size: true,
          storageKey: true,
          createdAt: true,
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!order) {
    return NextResponse.json(
      { error: "لم يتم العثور على التوثيق. تأكد من الرابط أو ابحث برقم الجوال أو البريد." },
      { status: 404 }
    );
  }

  const filesWithUrls = await Promise.all(
    order.proofFiles.map(async (file) => {
      try {
        const signedUrl = await getSignedUrlFromR2(file.storageKey, 3600);
        return {
          id: file.id,
          type: file.type,
          fileName: file.fileName,
          mimeType: file.mimeType,
          size: file.size,
          url: signedUrl,
          createdAt: file.createdAt,
          urlFailed: false,
        };
      } catch (error) {
        console.error("PROOF_SIGNED_URL_FAILED", {
          fileId: file.id,
          fileType: file.type,
          message: error instanceof Error ? error.message : String(error),
        });
        return {
          id: file.id,
          type: file.type,
          fileName: file.fileName,
          mimeType: file.mimeType,
          size: file.size,
          url: null,
          createdAt: file.createdAt,
          urlFailed: true,
        };
      }
    })
  );

  const hasFailedUrls = filesWithUrls.some((f) => f.urlFailed);
  const allUrlsFailed = filesWithUrls.length > 0 && filesWithUrls.every((f) => f.urlFailed);

  return NextResponse.json({
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      orderDate: order.orderDate,
      proofStatus: order.proofStatus,
    },
    files: filesWithUrls,
    hasFailedUrls,
    allUrlsFailed,
  });
}