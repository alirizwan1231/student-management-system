import type { PackExam, PackNote, PackSlot, PackSubject, PackTask } from "@/lib/classpack/types";

// Small stable hashes. They answer two questions without comparing everything field by field:
//  - did this item CHANGE in the pack since I last imported it?   (packHash)
//  - did I EDIT my own copy after importing it?                     (fp of the local record)
export function hashString(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

const t5 = (v: string | null | undefined) => (v ? v.slice(0, 5) : "");
const iso = (v: string | null | undefined) => (v && !Number.isNaN(new Date(v).getTime()) ? new Date(v).toISOString() : "");
const num = (v: unknown) => (v === null || v === undefined || v === "" ? "" : String(Number(v)));
const txt = (v: string | null | undefined) => (v ?? "").trim();

// The fields that exist both in the pack item and in the student's own record.
export const subjectCore = (s: { name: string; code: string | null; credit_hours: number | null; color: string | null; description: string | null }) => [
  txt(s.name),
  txt(s.code),
  num(s.credit_hours),
  txt(s.color),
  txt(s.description),
];
export const noteCore = (n: { title: string; lecture_number: number | null; lecture_date: string | null; short_summary: string | null; detailed_notes: string | null; keywords: string[] }) => [
  txt(n.title),
  num(n.lecture_number),
  txt(n.lecture_date),
  txt(n.short_summary),
  txt(n.detailed_notes),
  (n.keywords ?? []).join("|"),
];
export const taskCore = (t: { title: string; description: string | null; task_type: string; priority: string; deadline: string | null; marks: number | null }) => [
  txt(t.title),
  txt(t.description),
  t.task_type ?? "",
  t.priority ?? "",
  iso(t.deadline),
  num(t.marks),
];
export const examCore = (e: { title: string; exam_type: string; exam_date: string; start_time: string | null; duration_minutes: number | null; room: string | null; notes: string | null }) => [
  txt(e.title),
  e.exam_type,
  txt(e.exam_date),
  t5(e.start_time),
  num(e.duration_minutes),
  txt(e.room),
  txt(e.notes),
];

export const fp = (core: string[]) => hashString(JSON.stringify(core));
const slotsSig = (slots: PackSlot[]) => JSON.stringify(slots.map((s) => `${s.day_of_week}|${t5(s.start_time)}|${t5(s.end_time)}|${txt(s.room)}`).sort());

export const packHash = {
  subject: (s: PackSubject) => hashString(JSON.stringify([subjectCore(s), txt(s.instructor), slotsSig(s.slots)])),
  note: (n: PackNote) => hashString(JSON.stringify([noteCore(n), n.files.map((f) => `${f.title}|${f.url ?? ""}|${f.pack_path ?? ""}`)])),
  task: (t: PackTask) => fp(taskCore(t)),
  exam: (e: PackExam) => fp(examCore(e)),
};
