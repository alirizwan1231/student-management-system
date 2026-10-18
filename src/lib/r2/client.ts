import { S3Client } from "@aws-sdk/client-s3";
// Cloudflare R2 is S3-compatible; only the endpoint differs from AWS S3.
// This client is server-only -- it reads secret credentials from env vars
// that are never prefixed with NEXT_PUBLIC_, so they can never reach the
// browser bundle.
const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
if (!accountId || !accessKeyId || !secretAccessKey) {
  // Logged, not thrown, so the rest of the app still builds/runs before R2
  // env vars are filled in. Routes that actually use R2 will fail clearly.
  console.warn("R2 environment variables are not fully set. File storage routes will fail until they are.");
}
export const r2Client = new S3Client({
  region: "auto",
  endpoint: accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined,
  credentials: {
    accessKeyId: accessKeyId ?? "",
    secretAccessKey: secretAccessKey ?? "",
  },
});
export const R2_BUCKET = process.env.R2_BUCKET_NAME ?? "";
