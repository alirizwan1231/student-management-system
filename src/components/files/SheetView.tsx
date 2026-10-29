"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

/* eslint-disable @typescript-eslint/no-explicit-any */

const MAX_ROWS = 500;
const MAX_COLS = 40;
type Cell = string | number | boolean | null;

// Spreadsheets (.xlsx .xlsm .xls .ods) -> a readable table, using SheetJS. Shows the values as Excel shows them.
export function SheetView({ blob }: { blob: Blob }) {
  const bookRef = useRef<any>(null);
  const xlsxRef = useRef<any>(null);
  const [names, setNames] = useState<string[]>([]);
  const [active, setActive] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod: any = await import("xlsx");
        const XLSX = mod.default ?? mod;
        const book = XLSX.read(new Uint8Array(await blob.arrayBuffer()), { type: "array", cellDates: true });
        if (cancelled) return;
        xlsxRef.current = XLSX;
        bookRef.current = book;
        setNames(book.SheetNames as string[]);
        setActive(0);
        setReady(true);
      } catch {
        if (!cancelled) setError("Could not read this spreadsheet.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [blob]);

  const rows = useMemo<Cell[][]>(() => {
    if (!ready || !bookRef.current) return [];
    const sheet = bookRef.current.Sheets[names[active]];
    return xlsxRef.current.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "", blankrows: false }) as Cell[][];
  }, [ready, names, active]);

  if (error) return <p className="p-6 text-center text-sm text-rose-600 dark:text-rose-400">{error}</p>;
  if (!ready) return <p className="p-6 text-center text-sm text-slate-400">Preparing spreadsheet...</p>;

  const shown = rows.slice(0, MAX_ROWS);

  return (
    <div className="p-3">
      {names.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {names.map((name, i) => (
            <button
              key={name + i}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold",
                i === active ? "border-brand-500 bg-brand-600 text-white dark:bg-brand-500" : "border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300"
              )}
            >
              {name}
            </button>
          ))}
        </div>
      )}
      <div className="overflow-auto rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900">
        <table className="min-w-full border-collapse text-xs">
          <tbody>
            {shown.map((row, r) => (
              <tr key={r} className={r === 0 ? "bg-slate-50 font-semibold dark:bg-white/[0.05]" : ""}>
                {row.slice(0, MAX_COLS).map((cell, c) => (
                  <td key={c} className="max-w-[16rem] border border-slate-100 px-2.5 py-1.5 align-top text-slate-700 dark:border-white/[0.06] dark:text-slate-200">
                    {cell === null || cell === undefined ? "" : String(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > MAX_ROWS && <p className="mt-2 text-xs text-slate-400">Showing the first {MAX_ROWS} of {rows.length} rows. Download the file to see everything.</p>}
    </div>
  );
}
