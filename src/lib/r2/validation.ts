export const ALLOWED_EXTENSIONS = [
  "pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "png", "jpg", "jpeg", "webp", "gif",
];
export const MAX_FILE_SIZE_MB = 10;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024; // 10 MB per file
export function getExtension(fileName: string): string {
  const parts = fileName.split(".");
  return parts.length > 1 ? (parts.pop() as string).toLowerCase() : "";
}
export function validateUpload(fileName: string, size: number): string | null {
  const ext = getExtension(fileName);
  if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
    return `File type ".${ext || "unknown"}" is not allowed.`;
  }
  if (size <= 0) return "File is empty.";
  if (size > MAX_FILE_SIZE_BYTES) {
    return `"${fileName}" is too large. Maximum file size is ${MAX_FILE_SIZE_MB} MB.`;
  }
  return null;
}

// Fix 12 (audit M-6): the ONLY content type a given extension may use.
// Server routes must derive the stored content type from the file name with
// this map -- never from a client-supplied contentType string.
export const EXTENSION_CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};
export function contentTypeForFileName(fileName: string): string | null {
  return EXTENSION_CONTENT_TYPES[getExtension(fileName)] ?? null;
}
export function isAllowedContentType(contentType: string | null | undefined): boolean {
  if (!contentType) return false;
  const clean = contentType.split(";")[0].trim().toLowerCase();
  return Object.values(EXTENSION_CONTENT_TYPES).includes(clean) || clean === "application/octet-stream";
}
