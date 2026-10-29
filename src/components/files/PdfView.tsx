"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Renders a PDF with pdf.js, page by page, only when a page scrolls near the screen. Works the
// same on phones (Android Chrome cannot show PDFs inside a page by itself).
function PdfPage({ doc, pageNumber, width }: { doc: any; pageNumber: number; width: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const holderRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [height, setHeight] = useState(Math.round(width * 1.414));

  useEffect(() => {
    const el = holderRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => entry.isIntersecting && setVisible(true), { rootMargin: "800px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !doc) return;
    let task: any;
    let cancelled = false;
    (async () => {
      const page = await doc.getPage(pageNumber);
      const base = page.getViewport({ scale: 1 });
      const cssScale = width / base.width;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: cssScale * dpr });
      const canvas = canvasRef.current;
      if (!canvas || cancelled) return;
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
      canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;
      setHeight(Math.floor(viewport.height / dpr));
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      task = page.render({ canvasContext: ctx, viewport });
      await task.promise.catch(() => undefined);
    })();
    return () => {
      cancelled = true;
      task?.cancel?.();
    };
  }, [visible, doc, pageNumber, width]);

  return (
    <div ref={holderRef} className="mx-auto mb-3 bg-white shadow-sm" style={{ width, minHeight: height }}>
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}

export function PdfView({ blob }: { blob: Blob }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<any>(null);
  const [doc, setDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [boxWidth, setBoxWidth] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
        const data = new Uint8Array(await blob.arrayBuffer());
        const loaded = await pdfjs.getDocument({ data }).promise;
        if (cancelled) {
          loaded.destroy?.();
          return;
        }
        docRef.current = loaded;
        setDoc(loaded);
        setNumPages(loaded.numPages);
      } catch {
        if (!cancelled) setError("Could not read this PDF.");
      }
    })();
    return () => {
      cancelled = true;
      docRef.current?.destroy?.();
      docRef.current = null;
    };
  }, [blob]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setBoxWidth(Math.round(el.clientWidth / 10) * 10);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (error) return <p className="p-6 text-center text-sm text-rose-600 dark:text-rose-400">{error}</p>;

  const pageWidth = Math.max(200, Math.min(boxWidth - 16, 1000) * zoom);
  return (
    <div ref={wrapRef} className="w-full p-2">
      <div className="sticky top-0 z-10 mb-3 flex items-center justify-center gap-2">
        <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/95 px-2 py-1 text-xs font-semibold text-slate-600 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/95 dark:text-slate-300">
          <button type="button" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))} className="rounded-full p-1.5 hover:bg-slate-100 dark:hover:bg-white/10">
            <Minus size={14} />
          </button>
          <span className="min-w-[3rem] text-center">{Math.round(zoom * 100)}%</span>
          <button type="button" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))} className="rounded-full p-1.5 hover:bg-slate-100 dark:hover:bg-white/10">
            <Plus size={14} />
          </button>
          {numPages > 0 && <span className="border-l border-slate-200 pl-2 text-slate-400 dark:border-white/10">{numPages} pages</span>}
        </div>
      </div>
      {doc && boxWidth > 0 && (
        <div className="w-max min-w-full">
          {Array.from({ length: numPages }, (_, i) => (
            <PdfPage key={`${i}-${pageWidth}`} doc={doc} pageNumber={i + 1} width={pageWidth} />
          ))}
        </div>
      )}
    </div>
  );
}
