"use client";

import { DAY_NAMES, type ChoiceField, type PackSubject, type SubjectChoice } from "@/lib/classpack/types";

interface Props {
  s: PackSubject;
  choice: SubjectChoice | undefined;
  onToggle: (field: ChoiceField) => void;
  // publisher only: tick single notes/tasks/exams inside a ticked category
  items?: { selected: Record<string, boolean>; onToggleItem: (key: string) => void };
  extra?: React.ReactNode; // shown under the subject name (e.g. "link to my subject")
}

export function PackSubjectRow({ s, choice, onToggle, items, extra }: Props) {
  const notes = s.notes ?? [];
  const tasks = s.tasks ?? [];
  const exams = s.exams ?? [];
  const fileCount = notes.reduce((n, x) => n + x.files.length, 0);

  const rows: { field: ChoiceField; label: string; count: number; list?: { key: string; label: string }[] }[] = [
    { field: "instructor", label: `Instructor: ${s.instructor ?? "none"}`, count: s.instructor ? 1 : 0 },
    {
      field: "timetable",
      label: s.slots.length === 0 ? "Timetable: no classes" : `Timetable: ${s.slots.map((sl) => `${DAY_NAMES[sl.day_of_week]} ${sl.start_time}-${sl.end_time}${sl.room ? ` (${sl.room})` : ""}`).join(", ")}`,
      count: s.slots.length,
    },
    { field: "notes", label: `Notes: ${notes.length}${fileCount ? ` (${fileCount} files)` : ""}`, count: notes.length, list: notes.map((n) => ({ key: n.key, label: n.title })) },
    { field: "tasks", label: `Tasks: ${tasks.length}`, count: tasks.length, list: tasks.map((t) => ({ key: t.key, label: t.title })) },
    { field: "exams", label: `Exams: ${exams.length}`, count: exams.length, list: exams.map((e) => ({ key: e.key, label: `${e.title} (${e.exam_date})` })) },
  ];

  return (
    <li className="px-3 py-2.5">
      <label className="flex items-start gap-2.5">
        <input type="checkbox" className="mt-1" checked={Boolean(choice?.subject)} onChange={() => onToggle("subject")} />
        <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
          {s.name} {s.code && <span className="text-xs font-medium text-slate-400">({s.code})</span>}
        </span>
      </label>
      {extra && <div className="ml-6 mt-1">{extra}</div>}
      <div className="ml-6 mt-1.5 space-y-1 text-xs text-slate-500 dark:text-slate-400">
        {rows.map((r) => {
          const disabled = r.count === 0 || !choice?.subject;
          return (
            <div key={r.field} className={r.count === 0 ? "opacity-50" : ""}>
              <label className="flex items-center gap-2">
                <input type="checkbox" disabled={disabled} checked={Boolean(choice?.[r.field])} onChange={() => onToggle(r.field)} />
                {r.label}
              </label>
              {items && r.list && r.list.length > 0 && choice?.[r.field] && (
                <details className="ml-5 mt-1">
                  <summary className="cursor-pointer text-[11px] font-semibold text-brand-600 dark:text-brand-400">Choose individual items</summary>
                  <ul className="mt-1 space-y-0.5">
                    {r.list.map((i) => (
                      <li key={i.key}>
                        <label className="flex items-center gap-2">
                          <input type="checkbox" checked={items.selected[i.key] !== false} onChange={() => items.onToggleItem(i.key)} />
                          <span className="truncate">{i.label}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          );
        })}
      </div>
    </li>
  );
}
