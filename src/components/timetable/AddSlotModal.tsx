"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/Modal";
import { timetableSlotSchema, type TimetableSlotInput } from "@/lib/validation/timetable";
import { createTimetableSlot } from "@/lib/db/repo/timetable";
import { useAllSubjects } from "@/hooks/useSubjects";
import { useAllLecturers } from "@/hooks/useLecturers";
import { Select } from "@/components/ui/Select";
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const COLORS = ["#3366ff", "#16a34a", "#d97706", "#dc2626", "#9333ea", "#0891b2"];
const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";
const labelClass = "mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400";
export function AddSlotModal({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [color, setColor] = useState(COLORS[0]);
  const subjects = useAllSubjects(userId);
  const lecturers = useAllLecturers(userId);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<TimetableSlotInput>({
    resolver: zodResolver(timetableSlotSchema),
    defaultValues: { day_of_week: 0 },
  });
  const onSubmit = async (values: TimetableSlotInput) => {
    await createTimetableSlot(userId, { ...values, color });
    reset();
    setOpen(false);
  };
  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
        + Add Class
      </button>
      {open && (
        <Modal title="Add to timetable" onClose={() => setOpen(false)}>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
            <div>
              <label className={labelClass}>Subject</label>
              <Select required className={inputClass} {...register("subject_id")}>
                <option value="">Select a subject</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
              {errors.subject_id && <p className="text-xs text-status-overdue">{errors.subject_id.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Day</label>
              <Select className={inputClass} {...register("day_of_week")}>
                {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Start time</label>
                <input type="time" className={inputClass} {...register("start_time")} />
              </div>
              <div>
                <label className={labelClass}>End time</label>
                <input type="time" className={inputClass} {...register("end_time")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Room (optional)</label>
                <input placeholder="Room 204" className={inputClass} {...register("room")} />
              </div>
              <div>
                <label className={labelClass}>Instructor (optional)</label>
                <Select className={inputClass} {...register("lecturer_id")}>
                  <option value="">None</option>
                  {lecturers.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Starts from (optional)</label>
                <input type="date" className={inputClass} {...register("start_date")} />
              </div>
              <div>
                <label className={labelClass}>Ends on (optional)</label>
                <input type="date" className={inputClass} {...register("end_date")} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Color</label>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`h-7 w-7 rounded-full ${color === c ? "ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-900" : ""}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              Add to timetable
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
