"use client";
import { Check, X } from "lucide-react";
import { passwordChecklist } from "@/lib/validation/auth";

// Fix 9 (audit M-3): live checklist under every password field, so users see
// the rule while typing instead of one vague error after submit.
export function PasswordChecklist({ value }: { value: string }) {
  if (!value) return null;
  return (
    <ul className="mt-2 space-y-1" aria-live="polite">
      {passwordChecklist(value).map((item) => (
        <li key={item.label} className={`flex items-center gap-1.5 text-[11px] font-medium ${item.ok ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}`}>
          {item.ok ? <Check size={12} /> : <X size={12} />}
          {item.label}
        </li>
      ))}
    </ul>
  );
}
