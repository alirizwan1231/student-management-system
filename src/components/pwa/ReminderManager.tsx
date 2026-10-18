"use client";

import { useEffect } from "react";
import { db } from "@/lib/db";
import { useUser } from "@/hooks/useUser";
import { computeReminders } from "@/lib/reminders/engine";
import { REMINDERS_SEEN_KEY, remindersEnabled, showNotification } from "@/lib/reminders/storage";

const CHECK_EVERY_MS = 60 * 1000;
const KEEP_MS = 3 * 24 * 60 * 60 * 1000;

// While the app is open (or installed and running), checks once a minute for
// deadlines, exams and classes that need a reminder and shows each exactly once.
// For reminders when the app is closed, use the daily email digest (Settings).
export function ReminderManager() {
  const { user } = useUser();
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    const tick = async () => {
      if (!remindersEnabled()) return;
      const [tasks, exams, slots, exceptions, subjects] = await Promise.all([
        db.tasks.where({ user_id: userId }).filter((t) => t.deleted_at === null).toArray(),
        db.exams.where({ user_id: userId }).filter((e) => e.deleted_at === null).toArray(),
        db.timetableSlots.where({ user_id: userId }).filter((s) => s.deleted_at === null).toArray(),
        db.timetableExceptions.where({ user_id: userId }).filter((e) => e.deleted_at === null).toArray(),
        db.subjects.where({ user_id: userId }).filter((s) => s.deleted_at === null).toArray(),
      ]);
      const reminders = computeReminders({ tasks, exams, slots, exceptions, subjects, now: new Date() });
      let seen: Record<string, number> = {};
      try {
        seen = JSON.parse(localStorage.getItem(REMINDERS_SEEN_KEY) || "{}");
      } catch {
        seen = {};
      }
      const now = Date.now();
      for (const r of reminders) {
        if (seen[r.key]) continue;
        await showNotification(r.title, r.body, r.url, r.key).catch(() => undefined);
        seen[r.key] = now;
      }
      for (const k of Object.keys(seen)) if (now - seen[k] > KEEP_MS) delete seen[k];
      localStorage.setItem(REMINDERS_SEEN_KEY, JSON.stringify(seen));
    };
    void tick();
    const id = setInterval(() => void tick(), CHECK_EVERY_MS);
    return () => clearInterval(id);
  }, [userId]);

  return null;
}
