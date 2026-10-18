import { validateUpload } from "@/lib/r2/validation";

// Splits picked files into uploadable ones and human-readable rejections
// (wrong type, empty, or over the 10 MB limit). The server enforces the same
// rule in /api/storage/upload, so this is purely for fast, friendly feedback.
export function partitionValidFiles(files: File[]): { valid: File[]; errors: string[] } {
  const valid: File[] = [];
  const errors: string[] = [];
  for (const file of files) {
    const err = validateUpload(file.name, file.size);
    if (err) errors.push(err);
    else valid.push(file);
  }
  return { valid, errors };
}
