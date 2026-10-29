/* eslint-disable @typescript-eslint/no-explicit-any */

// Best-effort TEXT extraction from the old binary Office formats (.doc, .ppt). Pictures, tables and
// layout are not reconstructed; that would need a conversion server.

async function readCfb(data: Uint8Array, streamName: string): Promise<Uint8Array | null> {
  const mod: any = await import("xlsx");
  const CFB = mod.CFB ?? mod.default?.CFB;
  if (!CFB) return null;
  const cfb = CFB.read(data, { type: "array" });
  const entry = CFB.find(cfb, `/${streamName}`) ?? CFB.find(cfb, streamName);
  if (!entry?.content) return null;
  return entry.content instanceof Uint8Array ? entry.content : new Uint8Array(entry.content);
}

const utf16 = (b: Uint8Array) => new TextDecoder("utf-16le").decode(b);
const latin1 = (b: Uint8Array) => new TextDecoder("windows-1252").decode(b);
const paragraphs = (s: string) => s.replace(/\r\n?|\v/g, "\n");

// ---------- PowerPoint (.ppt) ----------
// The stream is a list of records: 2 bytes version/instance, 2 bytes type, 4 bytes length.
// Containers (version 0xF) hold more records; text lives in TextCharsAtom (0x0FA0, UTF-16)
// and TextBytesAtom (0x0FA8, 8-bit).
function extractPptText(s: Uint8Array): string {
  const view = new DataView(s.buffer, s.byteOffset, s.byteLength);
  const out: string[] = [];
  let slide = 0;
  let pos = 0;
  while (pos + 8 <= s.length) {
    const ver = view.getUint16(pos, true) & 0x000f;
    const type = view.getUint16(pos + 2, true);
    const len = view.getUint32(pos + 4, true);
    const start = pos + 8;
    const end = start + len;
    if (ver === 0xf) {
      if (type === 0x03f8) {
        pos = end; // slide master: boilerplate such as "Click to edit Master title style"
        continue;
      }
      if (type === 0x03ee) {
        slide += 1;
        out.push(`\n--- Slide ${slide} ---`);
      } else if (type === 0x03f0) {
        out.push("\n[Notes]");
      }
      pos = start; // look inside the container
      continue;
    }
    if (end > s.length) break;
    if (type === 0x0fa0) out.push(paragraphs(utf16(s.subarray(start, end))));
    else if (type === 0x0fa8) out.push(paragraphs(latin1(s.subarray(start, end))));
    pos = end;
  }
  return out.join("\n");
}

// ---------- Word (.doc) ----------
function guessDecode(bytes: Uint8Array): string {
  let zeros = 0;
  for (let i = 0; i < bytes.length; i++) if (bytes[i] === 0) zeros++;
  return zeros > bytes.length * 0.25 ? utf16(bytes) : latin1(bytes);
}

function cleanWord(text: string): string {
  return paragraphs(text)
    .replace(/\x13[^\x14\x15]*\x14/g, "") // field codes (hyperlinks, page numbers...) keep only the result
    .replace(/[\x00-\x08\x0e-\x1f\x7f]/g, "")
    .replace(/\x07/g, "\t")
    .replace(/\n{3,}/g, "\n\n");
}

function printableRuns(text: string): string {
  return (text.match(/[\p{L}\p{N}\p{P}\p{Zs}\n\t]{6,}/gu) ?? []).join("\n");
}

function extractDocText(w: Uint8Array): string {
  const view = new DataView(w.buffer, w.byteOffset, w.byteLength);
  if (w.length < 0x40 || view.getUint16(0, true) !== 0xa5ec) return printableRuns(guessDecode(w));
  const flags = view.getUint16(0x0a, true);
  if (flags & 0x0100) throw new Error("This Word file is password protected.");
  const fcMin = view.getUint32(0x18, true);
  const fcMac = view.getUint32(0x1c, true);
  const complex = (flags & 0x0004) !== 0; // "fast saved" files store the text in pieces
  if (!complex && fcMac > fcMin && fcMac <= w.length) return cleanWord(guessDecode(w.subarray(fcMin, fcMac)));
  return printableRuns(cleanWord(guessDecode(w)));
}

export async function extractLegacyText(data: Uint8Array, kind: "legacydoc" | "legacyppt"): Promise<string> {
  const stream = await readCfb(data, kind === "legacyppt" ? "PowerPoint Document" : "WordDocument");
  if (!stream) throw new Error("This does not look like a valid old-format Office file.");
  const text = (kind === "legacyppt" ? extractPptText(stream) : extractDocText(stream)).trim();
  if (!text) throw new Error("No readable text was found in this file.");
  return text;
}
