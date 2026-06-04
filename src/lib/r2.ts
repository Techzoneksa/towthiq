import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET || "";

export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

export async function getSignedUrlFromR2(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  return getSignedUrl(r2Client, command, { expiresIn });
}

export async function deleteFromR2(key: string): Promise<void> {
  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );
}

export async function healthCheck(): Promise<boolean> {
  const testKey = `health-check-${Date.now()}`;
  try {
    await r2Client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: testKey,
        Body: Buffer.from("health-check"),
        ContentType: "text/plain",
      })
    );
    await deleteFromR2(testKey);
    return true;
  } catch {
    return false;
  }
}

export function getContentType(fileName: string, fileType?: string): string {
  if (fileType) return fileType;
  const ext = fileName.split(".").pop()?.toLowerCase();
  const types: Record<string, string> = {
    mp4: "video/mp4",
    mov: "video/quicktime",
    webm: "video/webm",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };
  return types[ext || ""] || "application/octet-stream";
}

export function getStoragePath(
  orderNumber: string,
  type: "videos" | "images",
  fileName: string
): string {
  const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, "");
  return `proofs/${orderNumber}/${type}/${Date.now()}-${cleanName}`;
}
