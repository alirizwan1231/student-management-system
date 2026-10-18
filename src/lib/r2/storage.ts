import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Client, R2_BUCKET } from "@/lib/r2/client";
export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}
export async function getSignedDownloadUrl(key: string, expiresInSeconds = 3600): Promise<string> {
  const command = new GetObjectCommand({ Bucket: R2_BUCKET, Key: key });
  return getSignedUrl(r2Client, command, { expiresIn: expiresInSeconds });
}
export async function deleteObject(key: string): Promise<void> {
  await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
}
// Used only by the group "Save to My Resources" copy flow -- streams the
// original bytes server-side and re-uploads under the saver's own prefix,
// so the saver's personal copy is independently downloadable via the
// existing users/{user_id}/... ownership check (isOwnedPath).
export async function getObjectBuffer(key: string): Promise<{ buffer: Buffer; contentType: string }> {
  const res = await r2Client.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }));
  const stream = res.Body as NodeJS.ReadableStream;
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return { buffer: Buffer.concat(chunks), contentType: res.ContentType ?? "application/octet-stream" };
}
