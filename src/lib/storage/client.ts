"use client";

import { mimeFor } from "@/lib/files/types";

// Client-side helpers for file storage in Cloudflare R2.
//
// Uploads go DIRECTLY from the browser to R2 using a short-lived presigned URL, then the server
// verifies the real size. If direct upload is impossible (R2 CORS not configured yet, or a
// network/CORS failure) we transparently fall back to uploading through our own server route.
// XMLHttpRequest is used (not fetch) because only XHR reports upload progress.

class UploadRejected extends Error {}

const JSON_HEADERS = { "Content-Type": "application/json" };

function errorFrom(text: string, fallback: string) {
  try {
    return (JSON.parse(text) as { error?: string }).error || fallback;
  } catch {
    return fallback;
  }
}

function send(
  method: "PUT" | "POST",
  url: string,
  body: Blob | FormData,
  headers: Record<string, string>,
  onProgress?: (fraction: number) => void
): Promise<{ status: number; ok: boolean; text: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => resolve({ status: xhr.status, ok: xhr.status >= 200 && xhr.status < 300, text: xhr.responseText });
    xhr.onerror = () => reject(new TypeError("Network error"));
    xhr.ontimeout = () => reject(new TypeError("Upload timed out"));
    xhr.send(body);
  });
}

async function proxyUpload(resourceId: string, file: Blob, fileName: string, onProgress?: (fraction: number) => void): Promise<string> {
  const formData = new FormData();
  formData.append("file", file, fileName);
  formData.append("resourceId", resourceId);
  const res = await send("POST", "/api/storage/upload", formData, {}, onProgress);
  if (!res.ok) throw new Error(errorFrom(res.text, `Upload failed (${res.status})`));
  return (JSON.parse(res.text) as { storage_path: string }).storage_path;
}

export async function uploadResourceFile(
  resourceId: string,
  file: Blob,
  fileName: string,
  onProgress?: (fraction: number) => void
): Promise<string> {
  const contentType = file.type || "application/octet-stream";
  try {
    const pre = await fetch("/api/storage/presign", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ resourceId, fileName, size: file.size, contentType }),
    });
    if (pre.status === 400 || pre.status === 401) throw new UploadRejected(errorFrom(await pre.text(), "Upload not allowed"));
    if (pre.ok) {
      const { url, storage_path } = (await pre.json()) as { url: string; storage_path: string };
      const put = await send("PUT", url, file, { "Content-Type": contentType }, (f) => onProgress?.(f * 0.95)).catch(() => null);
      if (put && put.ok) {
        const conf = await fetch("/api/storage/confirm", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ path: storage_path }) });
        if (!conf.ok) throw new UploadRejected(errorFrom(await conf.text(), "Upload could not be verified"));
        onProgress?.(1);
        return storage_path;
      }
    }
  } catch (err) {
    if (err instanceof UploadRejected) throw err;
  }
  return proxyUpload(resourceId, file, fileName, onProgress);
}

export async function getResourceFileUrl(storagePath: string): Promise<string> {
  const res = await fetch(`/api/storage/download?path=${encodeURIComponent(storagePath)}`);
  if (!res.ok) throw new Error(errorFrom(await res.text(), "Could not get download link"));
  return ((await res.json()) as { url: string }).url;
}

export async function deleteResourceFile(storagePath: string): Promise<void> {
  const res = await fetch("/api/storage/delete", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ path: storagePath }) });
  if (!res.ok) throw new Error(errorFrom(await res.text(), "Delete failed"));
}

// kept for callers that only know the file name
export const guessMime = mimeFor;
