// Copies the PDF reader's worker script into public/ so the app can load it from its own address
// (works offline, no CDN). Runs automatically after "npm install". Never fails the install.
import fs from "node:fs";
import path from "node:path";

const candidates = ["legacy/build/pdf.worker.min.js", "build/pdf.worker.min.js"];
const root = path.join(process.cwd(), "node_modules", "pdfjs-dist");
const target = path.join(process.cwd(), "public", "pdf.worker.min.js");
const found = candidates.map((c) => path.join(root, c)).find((p) => fs.existsSync(p));
if (found) {
  fs.copyFileSync(found, target);
  console.log("PDF worker copied to public/pdf.worker.min.js");
} else {
  console.warn("pdfjs-dist not found yet; run npm install again if PDFs do not open.");
}
