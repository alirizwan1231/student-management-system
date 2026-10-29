import { CopyObjectCommand, DeleteObjectCommand, DeleteObjectsCommand, HeadObjectCommand, ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { R2_BUCKET, r2Client } from "@/lib/r2/client";

// Short-lived URL that lets the browser PUT one object straight to R2, so the
// file never passes through our server (no serverless body-size limit).
export async function createPresignedPut(key: string, contentType: string, expiresInSeconds = 300): Promise<string> {
  return getSignedUrl(r2Client, new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, ContentType: contentType }), { expiresIn: expiresInSeconds });
}

export async function getObjectHead(key: string): Promise<{ size: number; contentType: string | null } | null> {
  try {
    const head = await r2Client.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return { size: head.ContentLength ?? 0, contentType: head.ContentType ?? null };
  } catch {
    return null;
  }
}

export async function getObjectSize(key: string): Promise<number | null> {
  try {
    const head = await r2Client.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return head.ContentLength ?? 0;
  } catch {
    return null;
  }
}

export async function removeObject(key: string): Promise<void> {
  await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
}

// Deletes every object under a prefix (used when a user deletes their account).
export async function purgePrefix(prefix: string): Promise<number> {
  let removed = 0;
  let token: string | undefined;
  do {
    const page = await r2Client.send(new ListObjectsV2Command({ Bucket: R2_BUCKET, Prefix: prefix, ContinuationToken: token }));
    const keys = (page.Contents ?? []).flatMap((o) => (o.Key ? [{ Key: o.Key }] : []));
    if (keys.length > 0) {
      await r2Client.send(new DeleteObjectsCommand({ Bucket: R2_BUCKET, Delete: { Objects: keys, Quiet: true } }));
      removed += keys.length;
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return removed;
}

// Server-side copy inside the bucket (used to give a class pack its own copy of a shared file).
export async function copyObject(sourceKey: string, destKey: string): Promise<void> {
  const source = `${R2_BUCKET}/${sourceKey.split("/").map(encodeURIComponent).join("/")}`;
  await r2Client.send(new CopyObjectCommand({ Bucket: R2_BUCKET, Key: destKey, CopySource: source }));
}
