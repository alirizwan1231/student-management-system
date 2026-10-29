// What kind of viewer a file needs, and its real MIME type. Pure functions, safe on server and client.
export type ViewerKind = "pdf" | "image" | "docx" | "xlsx" | "pptx" | "legacydoc" | "legacyppt" | "text" | "office" | "other";

export function extOf(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? name;
  const i = base.lastIndexOf(".");
  return i === -1 ? "" : base.slice(i + 1).toLowerCase();
}

export function baseName(path: string): string {
  return path.split("/").pop() ?? path;
}

export function viewerKind(name: string): ViewerKind {
  const ext = extOf(name);
  if (ext === "pdf") return "pdf";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "avif"].includes(ext)) return "image";
  if (ext === "docx") return "docx";
  if (["xlsx", "xlsm", "xls", "ods"].includes(ext)) return "xlsx";
  if (ext === "pptx") return "pptx";
  if (ext === "doc") return "legacydoc";
  if (ext === "ppt") return "legacyppt";
  if (["txt", "md", "csv", "log", "json"].includes(ext)) return "text";
  if (["rtf", "odt", "odp", "key"].includes(ext)) return "office";
  return "other";
}

const MIME: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  bmp: "image/bmp",
  avif: "image/avif",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xlsm: "application/vnd.ms-excel.sheet.macroEnabled.12",
  xls: "application/vnd.ms-excel",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ppt: "application/vnd.ms-powerpoint",
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  json: "application/json",
};

export function mimeFor(name: string): string {
  return MIME[extOf(name)] ?? "application/octet-stream";
}
