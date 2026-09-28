"use client";

import { useUser } from "@/hooks/useUser";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { CalendarMonthView } from "@/components/calendar/CalendarMonthView";

export default function CalendarPage() {
  const { user } = useUser();
  const events = useCalendarEvents(user?.id);

  if (!user) return null;

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 font-display text-2xl font-semibold text-brand-700 dark:text-brand-400">Calendar</h1>
      <CalendarMonthView events={events} />
    </main>
  );
}
