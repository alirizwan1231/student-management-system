import type { ResourceType } from "@/types/academic";

// Guesses a ResourceType from a file name's extension, used when a file is
// attached somewhere that doesn't ask the user to pick a type explicitly
// (e.g. the quick "slides/notes" attach field on the lecture form).
export function inferResourceType(fileName: string): ResourceType {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (["ppt", "pptx", "key"].includes(ext)) return "ppt";
  if (["doc", "docx", "txt", "rtf"].includes(ext)) return "doc";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return "image";
  return "other";
}
