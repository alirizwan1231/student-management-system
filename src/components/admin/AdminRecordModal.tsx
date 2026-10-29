"use client";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { Select } from "@/components/ui/Select";
type FieldType = "text" | "number" | "date" | "datetime-local" | "textarea" | "select";
interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  source?: "semesters" | "subjects";
  required?: boolean;
}
const FIELD_CONFIG: Record<string, FieldConfig[]> = {
  semesters: [
    { key: "name", label: "Name", type: "text", required: true },
    { key: "number", label: "Number", type: "number", required: true },
    { key: "start_date", label: "Start date", type: "date" },
    { key: "end_date", label: "End date", type: "date" },
  ],
  subjects: [
    { key: "semester_id", label: "Semester", type: "select", source: "semesters", required: true },
    { key: "name", label: "Name", type: "text", required: true },
    { key: "code", label: "Code", type: "text" },
    { key: "lecturer_name", label: "Instructor", type: "text" },
    { key: "credit_hours", label: "Credit hours", type: "number" },
  ],
  lectures: [
    { key: "subject_id", label: "Subject", type: "select", source: "subjects", required: true },
    { key: "lecture_number", label: "Lecture #", type: "number" },
    { key: "title", label: "Title", type: "text", required: true },
    { key: "lecture_date", label: "Date (optional)", type: "date" },
    { key: "short_summary", label: "Summary", type: "textarea" },
    { key: "detailed_notes", label: "Notes", type: "textarea" },
  ],
  tasks: [
    { key: "subject_id", label: "Subject", type: "select", source: "subjects", required: true },
    { key: "title", label: "Title", type: "text", required: true },
    { key: "task_type", label: "Type", type: "select", options: ["assignment", "lab", "quiz", "presentation", "project", "other"] },
    { key: "priority", label: "Priority", type: "select", options: ["low", "medium", "high"] },
    { key: "status", label: "Status", type: "select", options: ["pending", "in_progress", "completed"] },
    { key: "deadline", label: "Deadline", type: "datetime-local" },
    { key: "marks", label: "Marks", type: "number" },
    { key: "description", label: "Description", type: "textarea" },
  ],
};
const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";
const labelClass = "mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400";
export function AdminRecordModal({
  table,
  userId,
  record,
  semesters,
  subjects,
  onClose,
  onSaved,
}: {
  table: "semesters" | "subjects" | "lectures" | "tasks";
  userId: string;
  record?: any; // existing record when editing, undefined when creating
  semesters: { id: string; name: string }[];
  subjects: { id: string; name: string }[];
  onClose: () => void;
  onSaved: (record: any) => void;
}) {
  const { showToast } = useToast();
  const fields = FIELD_CONFIG[table];
  const isEdit = !!record;
  const [values, setValues] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    for (const f of fields) initial[f.key] = record?.[f.key] ?? "";
    return initial;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setField = (key: string, value: any) => setValues((prev) => ({ ...prev, [key]: value }));
  const handleSave = async () => {
    for (const f of fields) {
      if (f.required && !values[f.key]) {
        setError(`${f.label} is required.`);
        return;
      }
    }
    setSaving(true);
    setError(null);
    const url = isEdit ? `/api/admin/records/${table}/${record.id}` : `/api/admin/users/${userId}/${table}`;
    const method = isEdit ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const body = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(body.error || "Could not save.");
      return;
    }
    showToast(isEdit ? "Saved successfully." : "Created successfully.");
    onSaved(body[table.slice(0, -1)] ?? body.record ?? body);
    onClose();
  };
  const sourceOptions = (source?: "semesters" | "subjects") =>
    source === "semesters" ? semesters : source === "subjects" ? subjects : [];
  return (
    <Modal title={isEdit ? `Edit ${table.slice(0, -1)}` : `Add ${table.slice(0, -1)}`} onClose={onClose}>
      <div className="flex flex-col gap-3">
        {fields.map((f) => (
          <div key={f.key}>
            <label className={labelClass}>{f.label}</label>
            {f.type === "select" ? (
              <Select className={inputClass} value={values[f.key] ?? ""} onChange={(e) => setField(f.key, e.target.value)}>
                <option value="">Select...</option>
                {(f.options ?? sourceOptions(f.source).map((o) => o.name ?? o)).map((opt: any, i: number) =>
                  f.source ? (
                    <option key={sourceOptions(f.source)[i]?.id ?? opt} value={sourceOptions(f.source)[i]?.id ?? opt}>
                      {opt}
                    </option>
                  ) : (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  )
                )}
              </Select>
            ) : f.type === "textarea" ? (
              <textarea
                rows={3}
                className={inputClass}
                value={values[f.key] ?? ""}
                onChange={(e) => setField(f.key, e.target.value)}
              />
            ) : (
              <input
                type={f.type}
                className={inputClass}
                value={values[f.key] ?? ""}
                onChange={(e) => setField(f.key, e.target.value)}
              />
            )}
          </div>
        ))}
        {error && <p className="text-xs font-medium text-status-overdue">{error}</p>}
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="w-full rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60 sm:w-auto sm:self-start"
        >
          {saving ? "Saving..." : isEdit ? "Save changes" : "Create"}
        </button>
      </div>
    </Modal>
  );
}
