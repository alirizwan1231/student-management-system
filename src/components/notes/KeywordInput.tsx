"use client";

import { useState } from "react";
import { X } from "lucide-react";

// Tag-style input: Enter or comma adds a chip, Backspace on an empty box
// removes the last one, each chip has its own remove button, and any text
// still in the box is committed when the field loses focus.
export function KeywordInput({
  value,
  onChange,
  placeholder = "Type a keyword and press Enter",
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState("");

  const commit = (raw: string) => {
    const parts = raw
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length === 0) {
      setText("");
      return;
    }
    const next = [...value];
    for (const part of parts) {
      if (!next.some((existing) => existing.toLowerCase() === part.toLowerCase())) next.push(part);
    }
    onChange(next);
    setText("");
  };

  return (
    <div className="flex min-h-[46px] flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white/80 px-2.5 py-2 transition-all focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/10 dark:border-white/[0.08] dark:bg-slate-900/60 dark:focus-within:border-brand-400">
      {value.map((keyword) => (
        <span
          key={keyword}
          className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-1 pl-2.5 pr-1.5 text-xs font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
        >
          {keyword}
          <button
            type="button"
            onClick={() => onChange(value.filter((k) => k !== keyword))}
            aria-label={`Remove ${keyword}`}
            className="rounded-full p-0.5 text-brand-500 transition-colors hover:bg-brand-100 hover:text-brand-700 dark:hover:bg-brand-500/20"
          >
            <X size={12} />
          </button>
        </span>
      ))}

      <input
        value={text}
        onChange={(e) => {
          const next = e.target.value;
          if (next.includes(",")) commit(next);
          else setText(next);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit(text);
          } else if (e.key === "Backspace" && text === "" && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => commit(text)}
        placeholder={value.length === 0 ? placeholder : "Add another..."}
        className="min-w-[140px] flex-1 bg-transparent px-1 py-1 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
      />
    </div>
  );
}
