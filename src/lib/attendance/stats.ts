import type { AttendanceRecord } from "@/types/attendance";

export type AttendanceLevel = "none" | "safe" | "warning" | "danger";

export interface SubjectAttendance {
  subjectId: string;
  present: number;
  late: number;
  absent: number;
  excused: number;
  held: number; // classes that count: present + late + absent (excused are ignored)
  attended: number; // present + late
  percentage: number | null;
  level: AttendanceLevel;
  canMiss: number; // classes that can still be skipped while staying at/above target
  needToAttend: number; // consecutive classes to attend to get back to target
}

export function computeAttendance(records: AttendanceRecord[], subjectId: string, target: number): SubjectAttendance {
  let present = 0, late = 0, absent = 0, excused = 0;
  for (const r of records) {
    if (r.subject_id !== subjectId || r.deleted_at) continue;
    if (r.status === "present") present++;
    else if (r.status === "late") late++;
    else if (r.status === "absent") absent++;
    else excused++;
  }
  const attended = present + late;
  const held = attended + absent;
  const t = Math.min(Math.max(target, 1), 99) / 100;
  const percentage = held === 0 ? null : (attended / held) * 100;
  let canMiss = 0;
  let needToAttend = 0;
  if (held > 0) {
    if (attended / held >= t) canMiss = Math.max(0, Math.floor(attended / t - held));
    else needToAttend = Math.max(1, Math.ceil((t * held - attended) / (1 - t)));
  }
  let level: AttendanceLevel = "none";
  if (percentage !== null) level = percentage < target ? "danger" : canMiss <= 1 ? "warning" : "safe";
  return { subjectId, present, late, absent, excused, held, attended, percentage, level, canMiss, needToAttend };
}

export function overallPercentage(records: AttendanceRecord[]): number | null {
  let attended = 0, held = 0;
  for (const r of records) {
    if (r.deleted_at) continue;
    if (r.status === "present" || r.status === "late") { attended++; held++; }
    else if (r.status === "absent") held++;
  }
  return held === 0 ? null : (attended / held) * 100;
}
