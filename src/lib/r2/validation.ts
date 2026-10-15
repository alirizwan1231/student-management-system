export const ALLOWED_EXTENSIONS = [
  "pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "png", "jpg", "jpeg", "webp",
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
