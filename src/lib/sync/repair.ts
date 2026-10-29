import { db } from "@/lib/db";
import { getMeta, setMeta } from "@/lib/db/repo/meta";
import { normalizePayload } from "@/lib/sync/normalize";

const DONE_KEY = "repair_empty_strings_v1";

// Columns that the forms used to store as "" when left empty. Postgres cannot accept "" in a
// date / timestamp / number / uuid column, which is why tasks and timetable slots stayed on this
// device only. Fixed ONCE per device: clean the local rows and the waiting uploads, and make failed
// uploads due immediately.
const BLANK_FIELDS: Record<string, string[]> = {
  tasks: ["deadline", "marks"],
  timetableSlots: ["lecturer_id", "start_date", "end_date"],
  timetableExceptions: ["new_date", "new_start_time", "new_end_time", "new_subject_id"],
  lectures: ["lecture_date"],
  semesters: ["start_date", "end_date"],
  subjects: ["lecturer_id"],
  exams: ["start_time", "duration_minutes"],
  gradeEntries: ["weight", "graded_on"],
};

export async function repairLocalData(): Promise<void> {
  if (await getMeta(DONE_KEY)) return;
  try {
    for (const [table, keys] of Object.entries(BLANK_FIELDS)) {
      await db.table(table).toCollection().modify((row: Record<string, unknown>) => {
        for (const k of keys) if (row[k] === "") row[k] = null;
      });
    }
    const queue = await db.syncQueue.toArray();
    for (const q of queue) {
      const payload = q.payload && typeof q.payload === "object" ? normalizePayload(q.payload as Record<string, unknown>) : q.payload;
      await db.syncQueue.update(q.id, { payload, status: "pending", next_attempt_at: null, last_error: null, attempts: 0 });
    }
    await setMeta(DONE_KEY, new Date().toISOString());
  } catch (err) {
    console.warn("Local data repair skipped:", err);
  }
}
