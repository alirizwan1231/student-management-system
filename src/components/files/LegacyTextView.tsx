"use client";

import { useEffect, useState } from "react";
import { Info } from "lucide-react";

// Text-only preview for old .doc / .ppt files.
export function LegacyTextView({ blob, kind }: { blob: Blob; kind: "legacydoc" | "legacyppt" }) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { extractLegacyText } = await import("@/lib/files/legacyText");
        const result = await extractLegacyText(new Uint8Array(await blob.arrayBuffer()), kind);
        if (!cancelled) setText(result);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not read this file.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [blob, kind]);

  return (
    <div className="mx-auto max-w-3xl p-4">
      <p className="mb-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
        <Info size={14} className="mt-0.5 shrink-0" />
        Text-only preview of an old-format file. Pictures and layout are not shown. Use "Full view (Microsoft)" or Download for everything.
      </p>
      {error ? (
        <p className="p-6 text-center text-sm text-rose-600 dark:text-rose-400">{error}</p>
      ) : text === null ? (
        <p className="p-6 text-center text-sm text-slate-400">Reading file...</p>
      ) : (
        <pre className="whitespace-pre-wrap break-words rounded-xl bg-white p-4 text-sm leading-6 text-slate-800 shadow-sm dark:bg-slate-900 dark:text-slate-200">{text}</pre>
      )}
    </div>
  );
}
