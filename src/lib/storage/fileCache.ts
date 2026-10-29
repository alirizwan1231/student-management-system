import { mimeFor } from "@/lib/files/types";
import type { OpenFileRequest } from "@/lib/files/viewerBus";

// Files are downloaded ONCE and kept on this device (browser Cache Storage). Opening the same
// file again is instant and also works offline. Cleared on sign-out (shared devices).
export const FILE_CACHE_NAME = "um-files";
const keyUrl = (key: string) => `/__um_files__/${encodeURIComponent(key)}`;
const hasCache = () => typeof caches !== "undefined";

export async function readCachedFile(key: string): Promise<Blob | null> {
  if (!hasCache()) return null;
  try {
    const cache = await caches.open(FILE_CACHE_NAME);
    const hit = await cache.match(keyUrl(key));
    return hit ? await hit.blob() : null;
  } catch {
    return null;
  }
}

async function writeCachedFile(key: string, blob: Blob) {
  if (!hasCache()) return;
  try {
    const cache = await caches.open(FILE_CACHE_NAME);
    await cache.put(keyUrl(key), new Response(blob, { headers: { "Content-Type": blob.type || "application/octet-stream" } }));
  } catch {
    /* storage full or blocked: the file still opens, it just is not kept */
  }
}

export async function isFileCached(key: string): Promise<boolean> {
  if (!hasCache()) return false;
  try {
    const cache = await caches.open(FILE_CACHE_NAME);
    return Boolean(await cache.match(keyUrl(key)));
  } catch {
    return false;
  }
}

export async function clearFileCache() {
  if (hasCache()) await caches.delete(FILE_CACHE_NAME).catch(() => undefined);
}

async function downloadWithProgress(url: string, onProgress: (fraction: number | null) => void): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const total = Number(res.headers.get("content-length")) || 0;
  if (!res.body) return await res.blob();
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    onProgress(total ? Math.min(1, received / total) : null);
  }
  return new Blob(chunks as BlobPart[]);
}

export async function loadFile(
  req: OpenFileRequest,
  onProgress: (fraction: number | null) => void
): Promise<{ blob: Blob; fromCache: boolean }> {
  const type = mimeFor(req.name);
  const typed = (b: Blob) => (b.type && b.type !== "application/octet-stream" ? b : new Blob([b], { type }));

  if (req.blob) return { blob: typed(req.blob), fromCache: true };
  if (req.cacheKey) {
    const cached = await readCachedFile(req.cacheKey);
    if (cached) return { blob: typed(cached), fromCache: true };
  }
  if (!req.getUrl) throw new Error("No source for this file");
  const url = await req.getUrl();
  const blob = typed(await downloadWithProgress(url, onProgress));
  if (req.cacheKey) await writeCachedFile(req.cacheKey, blob);
  return { blob, fromCache: false };
}
