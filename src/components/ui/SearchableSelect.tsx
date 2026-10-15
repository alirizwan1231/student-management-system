"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface SelectOption {
  value: string;
  label: string;
  hint?: string;
}

// Dropdown that becomes searchable once it has more than a handful of
// options. The popup always matches the trigger's width (left-0 right-0), so
// it can never overflow its container on small screens.
export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select",
  searchPlaceholder = "Search...",
  emptyText = "No options available",
  disabled,
  hasError,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  hasError?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);
  const searchable = options.length > 6;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => `${o.label} ${o.hint ?? ""}`.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const onMouseDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-xl border bg-slate-50/70 px-3.5 py-2.5 text-left text-sm font-medium outline-none transition-all duration-200",
          "border-slate-200 text-slate-900 hover:border-slate-300 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10",
          "dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-100 dark:hover:border-white/[0.14] dark:focus:border-brand-400 dark:focus:bg-slate-900 dark:focus:ring-brand-500/10",
          !selected && "text-slate-400 dark:text-slate-500",
          hasError && "border-status-overdue/60 focus:border-status-overdue",
          disabled && "cursor-not-allowed opacity-60"
        )}
      >
        <span className="min-w-0 flex-1 truncate">{selected?.label ?? placeholder}</span>
        {selected?.hint && (
          <span className="hidden shrink-0 text-xs font-semibold text-slate-400 sm:inline dark:text-slate-500">
            {selected.hint}
          </span>
        )}
        <ChevronDown
          size={16}
          className={cn("shrink-0 text-slate-400 transition-transform duration-200", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 dark:border-white/[0.08] dark:bg-slate-900 dark:shadow-black/30">
          {searchable && (
            <div className="border-b border-slate-100 p-2 dark:border-white/[0.06]">
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs font-medium text-slate-800 outline-none focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-100"
                />
              </div>
            </div>
          )}

          <ul role="listbox" className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2.5 text-xs text-slate-400 dark:text-slate-500">{emptyText}</li>
            ) : (
              filtered.map((option) => {
                const isSelected = option.value === value;
                return (
                  <li key={option.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        onChange(option.value);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors",
                        isSelected
                          ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                          : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/[0.05]"
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate">{option.label}</span>
                      {option.hint && (
                        <span className="shrink-0 text-[11px] font-semibold text-slate-400 dark:text-slate-500">{option.hint}</span>
                      )}
                      {isSelected && <Check size={14} className="shrink-0 text-brand-600 dark:text-brand-400" />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
