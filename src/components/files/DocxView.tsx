"use client";

import { useEffect, useState } from "react";

// Word (.docx) -> HTML with mammoth, shown inside a sandboxed frame (no scripts can run from the file).
export function DocxView({ blob }: { blob: Blob }) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod: any = await import("mammoth/mammoth.browser");
        const mammoth = mod.default ?? mod;
        const result = await mammoth.convertToHtml({ arrayBuffer: await blob.arrayBuffer() });
        if (!cancelled) setHtml(result.value as string);
      } catch {
        if (!cancelled) setError("Could not read this Word file.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [blob]);

  if (error) return <p className="p-6 text-center text-sm text-rose-600 dark:text-rose-400">{error}</p>;
  if (html === null) return <p className="p-6 text-center text-sm text-slate-400">Preparing document...</p>;

  const doc = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;line-height:1.6;color:#0f172a;background:#fff;margin:0;padding:20px;word-wrap:break-word}
    img{max-width:100%;height:auto} table{border-collapse:collapse;max-width:100%} td,th{border:1px solid #cbd5e1;padding:6px 8px}
    h1,h2,h3{line-height:1.25} a{color:#2563eb}
  </style></head><body>${html}</body></html>`;
  return <iframe title="Document" sandbox="" srcDoc={doc} className="h-full min-h-[70vh] w-full bg-white" />;
}
