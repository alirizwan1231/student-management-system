// Storage path convention, kept in one place so the upload route and the
// ownership checks in download/delete always agree:
//
//   users/{user_id}/{resource_id}/{sanitized_file_name}
const UNSAFE_CHARS = /[^a-zA-Z0-9._-]/g;
export function sanitizeFileName(name: string): string {
  const trimmed = name.trim().slice(-150); // keep it short, keep the extension
  const cleaned = trimmed.replace(UNSAFE_CHARS, "_");
  return cleaned || "file";
}
export function buildR2Path(userId: string, resourceId: string, fileName: string): string {
  return `users/${userId}/${resourceId}/${sanitizeFileName(fileName)}`;
}
// A user may only ever touch keys under their own prefix. Every route that
// touches R2 (download, delete) must pass this check first.
export function isOwnedPath(path: string, userId: string): boolean {
  return path === `users/${userId}` || path.startsWith(`users/${userId}/`);
}
