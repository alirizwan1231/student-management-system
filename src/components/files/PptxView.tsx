"use client";

import { useEffect, useRef, useState } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Fallback when the slide renderer cannot draw a file: just the text of every slide.
async function pptxOutline(buffer: ArrayBuffer): Promise<string[]> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(buffer);
  const number = (n: string) => Number(n.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
  const names = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => number(a) - number(b));
  const slides: string[] = [];
  for (const name of names) {
    const xml = await zip.files[name].async("string");
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    const paragraphs = Array.from(doc.getElementsByTagName("a:p"))
      .map((p) => Array.from(p.getElementsByTagName("a:t")).map((t) => t.textContent ?? "").join(""))
      .filter(Boolean);
    slides.push(paragraphs.join("\n"));
  }
  return slides;
}

// PowerPoint (.pptx): real slide rendering with pptx-preview, text outline if that fails.
export function PptxView({ blob }: { blob: Blob }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [outline, setOutline] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let previewer: any = null;
    (async () => {
      const buffer = await blob.arrayBuffer();
      try {
        const mod: any = await import("pptx-preview");
        const host = hostRef.current;
        if (!host || cancelled) return;
        const width = Math.min(960, Math.max(280, host.clientWidth - 16));
        host.innerHTML = "";
        previewer = mod.init(host, { width, height: Math.round((width * 9) / 16), mode: "list" });
        await previewer.preview(buffer);
      } catch {
        if (cancelled) return;
        try {
          setOutline(await pptxOutline(buffer));
        } catch {
          setError("Could not read this PowerPoint file.");
        }
      }
    })();
    return () => {
      cancelled = true;
      try {
        previewer?.destroy?.();
      } catch {
        /* ignore */
      }
    };
  }, [blob]);

  if (error) return <p className="p-6 text-center text-sm text-rose-600 dark:text-rose-400">{error}</p>;

  return (
    <>
      <div ref={hostRef} className={outline ? "hidden" : "mx-auto flex w-full max-w-4xl flex-col items-center gap-3 p-2"} />
      {outline && (
        <div className="mx-auto max-w-3xl space-y-3 p-4">
          <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
            The slides could not be drawn, so only their text is shown.
          </p>
          {outline.map((text, i) => (
            <section key={i} className="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
              <h3 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">Slide {i + 1}</h3>
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800 dark:text-slate-200">{text || "(no text)"}</p>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
