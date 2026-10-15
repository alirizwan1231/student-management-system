"use client";

// Client-side helpers for file storage in Cloudflare R2.
//
// Uploads go DIRECTLY from the browser to R2 using a short-lived presigned
// URL (so size is not limited by serverless request-body caps), then the
// server verifies the real size. If direct upload is impossible (R2 CORS not
// configured yet, or a network/CORS failure) we transparently fall back to
// uploading through our own server route.

class UploadRejected extends Error {}

const JSON_HEADERS = { "Content-Type": "application/json" };

async function errorMessage(res: Response, fallback: string) {
  const body = await res.json().catch(() => ({}));
  return (body as { error?: string }).error || fallback;
}

async function proxyUpload(resourceId: string, file: Blob, fileName: string): Promise<string> {
  const formData = new FormData();
  formData.append("file", file, fileName);
  formData.append("resourceId", resourceId);
  const res = await fetch("/api/storage/upload", { method: "POST", body: formData });
  if (!res.ok) throw new Error(await errorMessage(res, "Upload failed"));
  return ((await res.json()) as { storage_path: string }).storage_path;
}

export async function uploadResourceFile(resourceId: string, file: Blob, fileName: string): Promise<string> {
  const contentType = file.type || "application/octet-stream";
  try {
    const pre = await fetch("/api/storage/presign", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ resourceId, fileName, size: file.size, contentType }),
    });
    if (pre.status === 400 || pre.status === 401) throw new UploadRejected(await errorMessage(pre, "Upload not allowed"));
    if (pre.ok) {
      const { url, storage_path } = (await pre.json()) as { url: string; storage_path: string };
      const put = await fetch(url, { method: "PUT", headers: { "Content-Type": contentType }, body: file }).catch(() => null);
      if (put && put.ok) {
        const conf = await fetch("/api/storage/confirm", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ path: storage_path }) });
        if (!conf.ok) throw new UploadRejected(await errorMessage(conf, "Upload could not be verified"));
        return storage_path;
      }
    }
  } catch (err) {
    if (err instanceof UploadRejected) throw err;
  }
  return proxyUpload(resourceId, file, fileName);
}

export async function getResourceFileUrl(storagePath: string): Promise<string> {
  const res = await fetch(`/api/storage/download?path=${encodeURIComponent(storagePath)}`);
  if (!res.ok) throw new Error(await errorMessage(res, "Could not get download link"));
  return ((await res.json()) as { url: string }).url;
}

export async function deleteResourceFile(storagePath: string): Promise<void> {
  const res = await fetch("/api/storage/delete", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ path: storagePath }) });
  if (!res.ok) throw new Error(await errorMessage(res, "Delete failed"));
}
