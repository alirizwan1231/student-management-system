export interface TimetableSlot {
  id: string;
  user_id: string;
  subject_id: string;
  day_of_week: number; // 0=Mon .. 6=Sun
  start_time: string;  // "09:00"
  end_time: string;    // "10:30"
  room: string | null;
  lecturer_id: string | null;
  color: string | null;
  start_date: string | null; // yyyy-MM-dd, optional bound
  end_date: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
export type TimetableExceptionType = "cancelled" | "moved";
export interface TimetableException {
  id: string;
  user_id: string;
  timetable_slot_id: string;
  occurrence_date: string; // the original date being overridden
  exception_type: TimetableExceptionType;
  new_date: string | null;
  new_start_time: string | null;
  new_end_time: string | null;
  new_subject_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
