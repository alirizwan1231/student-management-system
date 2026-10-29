// Makes a local record safe to send to Postgres.
//
// Root cause of "added locally but never reaches Supabase": forms keep empty
// inputs as "" (for example the task deadline defaults to ""). Postgres rejects
// "" for timestamp / date / number / uuid columns, so the upload failed forever
// while the task kept showing up locally. We now convert those to null, and send
// date-times as real UTC instants so the time is the same on every device.

const DATE_ONLY_KEYS = new Set(["lecture_date", "start_date", "end_date", "due_date", "graded_on", "exam_date", "attendance_date", "occurrence_date"]);
const DATETIME_KEYS = new Set(["deadline", "completed_at", "archived_at"]);

export function normalizePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...payload };
  for (const [key, value] of Object.entries(out)) {
    if (value === "") {
      if (DATE_ONLY_KEYS.has(key) || DATETIME_KEYS.has(key) || key === "marks" || key === "score" || key === "weight" || (key.endsWith("_id") && key !== "id" && key !== "user_id")) {
        out[key] = null;
      }
      continue;
    }
    if (DATETIME_KEYS.has(key) && typeof value === "string") {
      // "2026-10-18T14:30" has no time zone: treat it as the user's local time, store as UTC.
      const d = new Date(value);
      out[key] = Number.isNaN(d.getTime()) ? null : d.toISOString();
    }
    if ((key === "marks" || key === "score" || key === "weight") && typeof value === "string") {
      const n = Number(value);
      out[key] = Number.isFinite(n) ? n : null;
    }
  }
  return out;
}
