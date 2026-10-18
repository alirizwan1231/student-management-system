"use client";

import { useMemo, useState } from "react";
import { useAllLecturers } from "@/hooks/useLecturers";
import { Select } from "@/components/ui/Select";

const NEW_VALUE = "__new__";

// Choose an existing instructor from a list, or add a new one. The form still
// stores the instructor NAME; findOrCreateLecturer() links it to the right
// instructor record when the subject is saved.
export function InstructorPicker({
  userId,
  value,
  onChange,
  inputClass,
}: {
  userId: string;
  value: string;
  onChange: (name: string) => void;
  inputClass: string;
}) {
  const lecturers = useAllLecturers(userId);
  const [adding, setAdding] = useState(false);

  const names = useMemo(() => {
    const seen = new Map<string, string>();
    for (const l of lecturers ?? []) {
      const key = l.name.trim().toLowerCase();
      if (key && !seen.has(key)) seen.set(key, l.name.trim());
    }
    const current = value.trim();
    if (current && !seen.has(current.toLowerCase())) seen.set(current.toLowerCase(), current); // keep old/typed names selectable
    return [...seen.values()].sort((a, b) => a.localeCompare(b));
  }, [lecturers, value]);

  if (adding) {
    return (
      <div>
        <input autoFocus placeholder="New instructor name, e.g. Dr. Ahmed" className={inputClass} value={value} onChange={(e) => onChange(e.target.value)} />
        <button
          type="button"
          onClick={() => {
            setAdding(false);
            onChange("");
          }}
          className="mt-1 text-[11px] font-semibold text-brand-600 hover:underline dark:text-brand-400"
        >
          Choose an existing instructor instead
        </button>
      </div>
    );
  }

  const selected = names.find((n) => n.toLowerCase() === value.trim().toLowerCase()) ?? "";
  return (
    <div>
      <Select
        className={inputClass}
        value={selected}
        onChange={(e) => {
          if (e.target.value === NEW_VALUE) {
            setAdding(true);
            onChange("");
          } else {
            onChange(e.target.value);
          }
        }}
      >
        <option value="">No instructor</option>
        {names.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
        <option value={NEW_VALUE}>+ Add new instructor...</option>
      </Select>
      <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">Pick an existing instructor or add a new one.</p>
    </div>
  );
}
