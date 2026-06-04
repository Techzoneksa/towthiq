import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const bucket = process.env.CLOUDFLARE_R2_BUCKET;

  const missingEnv: string[] = [];
  if (!accountId) missingEnv.push("CLOUDFLARE_ACCOUNT_ID");
  if (!accessKeyId) missingEnv.push("CLOUDFLARE_R2_ACCESS_KEY_ID");
  if (!secretAccessKey) missingEnv.push("CLOUDFLARE_R2_SECRET_ACCESS_KEY");
  if (!bucket) missingEnv.push("CLOUDFLARE_R2_BUCKET");

  if (missingEnv.length > 0) {
    return NextResponse.json({
      ok: false,
      missingEnv,
      bucketReachable: false,
      canPutTestObject: false,
      canDeleteTestObject: false,
      errorCode: "MISSING_ENV",
      message: "Storage configuration is incomplete",
    });
  }

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: accessKeyId as string,
      secretAccessKey: secretAccessKey as string,
    },
  });

  const testKey = `health-check/${Date.now()}-test.txt`;
  const testContent = Buffer.from("health-check-content");

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: testKey,
        Body: testContent,
        ContentType: "text/plain",
      })
    );

    let canDelete = false;
    try {
      await client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: testKey,
        })
      );
      canDelete = true;
    } catch {
      canDelete = false;
    }

    return NextResponse.json({
      ok: true,
      missingEnv: [],
      bucketReachable: true,
      canPutTestObject: true,
      canDeleteTestObject: canDelete,
      errorCode: null,
      message: "R2 is healthy",
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      missingEnv: [],
      bucketReachable: true,
      canPutTestObject: false,
      canDeleteTestObject: false,
      errorCode: "R2_ERROR",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}