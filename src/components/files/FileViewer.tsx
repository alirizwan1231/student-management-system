"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Download, ExternalLink, HardDrive, Monitor, X } from "lucide-react";
import { OPEN_FILE_EVENT, type OpenFileRequest } from "@/lib/files/viewerBus";
import { viewerKind } from "@/lib/files/types";
import { loadFile } from "@/lib/storage/fileCache";

const PdfView = dynamic(() => import("@/components/files/PdfView").then((m) => m.PdfView), { ssr: false });
const DocxView = dynamic(() => import("@/components/files/DocxView").then((m) => m.DocxView), { ssr: false });
const SheetView = dynamic(() => import("@/components/files/SheetView").then((m) => m.SheetView), { ssr: false });
const PptxView = dynamic(() => import("@/components/files/PptxView").then((m) => m.PptxView), { ssr: false });
const LegacyTextView = dynamic(() => import("@/components/files/LegacyTextView").then((m) => m.LegacyTextView), { ssr: false });

// Full-screen file reader. Mounted once in the app shell; any screen opens it with openFileViewer().
export function FileViewerHost() {
  const [req, setReq] = useState<OpenFileRequest | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [progress, setProgress] = useState<number | null>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const next = (e as CustomEvent<OpenFileRequest>).detail;
      setReq(next);
      setBlob(null);
      setError(null);
      setFromCache(false);
      setProgress(0);
    };
    window.addEventListener(OPEN_FILE_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_FILE_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!req) return;
    let cancelled = false;
    loadFile(req, setProgress)
      .then((r) => {
        if (cancelled) return;
        setBlob(r.blob);
        setFromCache(r.fromCache);
      })
      .catch(() => !cancelled && setError("Could not load this file."));
    return () => {
      cancelled = true;
    };
  }, [req]);

  const close = useCallback(() => setReq(null), []);

  useEffect(() => {
    if (!req) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [req, close]);

  const imageUrl = useMemo(() => (blob && req && viewerKind(req.name) === "image" ? URL.createObjectURL(blob) : null), [blob, req]);
  useEffect(() => () => void (imageUrl && URL.revokeObjectURL(imageUrl)), [imageUrl]);

  if (!req) return null;
  const kind = viewerKind(req.name);
  const canViewOnline = Boolean(req.getUrl) && ["pptx", "legacydoc", "legacyppt", "office"].includes(kind);

  const save = () => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = req.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  const openInTab = async () => {
    if (!req.getUrl) return;
    window.open(await req.getUrl(), "_blank", "noopener,noreferrer");
  };

  const openMicrosoft = async () => {
    if (!req.getUrl) return;
    if (!window.confirm("Open with Microsoft's online viewer? A temporary link to this file is shared with Microsoft so it can display it.")) return;
    const url = await req.getUrl();
    window.open(`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-slate-100 dark:bg-slate-950" role="dialog" aria-modal="true" aria-label={req.name}>
      <header className="flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-2.5 dark:border-white/10 dark:bg-slate-900">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{req.name}</p>
          {fromCache && (
            <p className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <HardDrive size={11} />
              Saved on this device, opens offline
            </p>
          )}
        </div>
        {canViewOnline && (
          <button type="button" onClick={openMicrosoft} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5">
            <Monitor size={14} />
            <span className="hidden sm:inline">Full view (Microsoft)</span>
          </button>
        )}
        <button type="button" onClick={save} disabled={!blob} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5">
          <Download size={14} />
          <span className="hidden sm:inline">Download</span>
        </button>
        <button type="button" onClick={close} aria-label="Close" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10">
          <X size={18} />
        </button>
      </header>

      <main className="min-h-0 flex-1 overflow-auto">
        {error ? (
          <div className="mx-auto max-w-md p-8 text-center">
            <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{error}</p>
            <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
              If you are online this is usually the storage bucket's CORS setting (see README.md, section Cloudflare R2). You can still open the file in a new tab.
            </p>
            {req.getUrl && (
              <button type="button" onClick={openInTab} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 dark:bg-brand-500">
                <ExternalLink size={14} />
                Open in a new tab
              </button>
            )}
          </div>
        ) : !blob ? (
          <div className="mx-auto max-w-xs p-10 text-center">
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Downloading once...</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
              <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: progress === null ? "40%" : `${Math.round(progress * 100)}%` }} />
            </div>
            <p className="mt-2 text-[11px] text-slate-400">Next time it opens instantly.</p>
          </div>
        ) : kind === "pdf" ? (
          <PdfView blob={blob} />
        ) : kind === "image" && imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={req.name} className="mx-auto max-h-full max-w-full object-contain p-3" />
        ) : kind === "docx" ? (
          <DocxView blob={blob} />
        ) : kind === "xlsx" ? (
          <SheetView blob={blob} />
        ) : kind === "pptx" ? (
          <PptxView blob={blob} />
        ) : kind === "legacydoc" || kind === "legacyppt" ? (
          <LegacyTextView blob={blob} kind={kind} />
        ) : kind === "text" ? (
          <TextView blob={blob} />
        ) : (
          <div className="mx-auto max-w-md p-8 text-center">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">This file type cannot be shown inside the app yet.</p>
            <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">It is already saved on this device, so downloading is instant.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={save} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 dark:bg-brand-500">
                Download
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function TextView({ blob }: { blob: Blob }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    blob.slice(0, 1_000_000).text().then((t) => !cancelled && setText(t));
    return () => {
      cancelled = true;
    };
  }, [blob]);
  return <pre className="whitespace-pre-wrap break-words p-4 text-xs leading-6 text-slate-800 dark:text-slate-200">{text ?? "Loading..."}</pre>;
}
