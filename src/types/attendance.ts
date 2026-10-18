import type { SyncMeta } from "@/types/academic";

export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export interface AttendanceRecord extends SyncMeta {
  subject_id: string;
  timetable_slot_id: string | null;
  attendance_date: string; // yyyy-MM-dd
  status: AttendanceStatus;
  notes: string | null;
}
