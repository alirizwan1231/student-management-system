"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";

const MAX_ROWS = 500;
const MAX_COLS = 40;
type Cell = string | number | boolean | Date | null;

// Excel (.xlsx) -> a readable table. Values only (formulas show their results).
export function SheetView({ blob }: { blob: Blob }) {
  const [sheets, setSheets] = useState<string[]>([]);
  const [active, setActive] = useState(0);
  const [rows, setRows] = useState<Cell[][] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = await import("read-excel-file");
        const names = await mod.readSheetNames(blob as File);
        if (!cancelled) setSheets(names);
      } catch {
        if (!cancelled) setError("Could not read this Excel file.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [blob]);

  useEffect(() => {
    if (sheets.length === 0) return;
    let cancelled = false;
    setRows(null);
    (async () => {
      try {
        const mod = await import("read-excel-file");
        const data = (await mod.default(blob as File, { sheet: active + 1 })) as Cell[][];
        if (!cancelled) setRows(data);
      } catch {
        if (!cancelled) setError("Could not read this sheet.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [blob, sheets, active]);

  if (error) return <p className="p-6 text-center text-sm text-rose-600 dark:text-rose-400">{error}</p>;
  if (!rows) return <p className="p-6 text-center text-sm text-slate-400">Preparing spreadsheet...</p>;

  const shown = rows.slice(0, MAX_ROWS);
  const show = (c: Cell) => (c === null || c === undefined ? "" : c instanceof Date ? c.toLocaleDateString() : String(c));

  return (
    <div className="p-3">
      {sheets.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {sheets.map((name, i) => (
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
                    {show(cell)}
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
