"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { addMonths, format, isSameMonth, subMonths } from "date-fns";
import { buildMonthGrid } from "@/lib/utils/calendar";
import type { CalendarEvent } from "@/lib/db/repo/calendar";
import { cn } from "@/lib/utils/cn";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_EVENTS_DESKTOP = 3;

export function CalendarMonthView({
  events,
}: {
  events: CalendarEvent[];
}) {
  const [anchor, setAnchor] = useState(() => new Date());

  const days = useMemo(() => buildMonthGrid(anchor), [anchor]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();

    for (const event of events) {
      const existing = map.get(event.date);

      if (existing) {
        existing.push(event);
      } else {
        map.set(event.date, [event]);
      }
    }

    return map;
  }, [events]);

  const goToday = () => {
    setAnchor(new Date());
  };

  const previousMonth = () => {
    setAnchor((current) => subMonths(current, 1));
  };

  const nextMonth = () => {
    setAnchor((current) => addMonths(current, 1));
  };

  const isCurrentMonth = isSameMonth(anchor, new Date());

  return (
    <section className="relative flex h-full min-h-0 w-full flex-col">
      {/* Background atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[70%] -translate-x-1/2 rounded-full bg-brand-500/[0.06] blur-3xl dark:bg-brand-400/[0.04]"
      />

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_8px_40px_rgba(15,23,42,0.05)] dark:border-white/[0.08] dark:bg-slate-950 dark:shadow-none sm:rounded-[28px]">
        {/* ─────────────── Header ─────────────── */}
        <header className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-4 dark:border-white/[0.07] sm:px-6 sm:py-5">
          {/* Month title */}
          <div className="flex min-w-0 items-center gap-3">
            <div className="hidden h-10 w-1 rounded-full bg-brand-500 sm:block" />

            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <h2 className="truncate text-xl font-bold tracking-[-0.025em] text-slate-950 dark:text-white sm:text-2xl">
                  {format(anchor, "MMMM")}
                </h2>

                <span className="text-sm font-medium text-slate-400 dark:text-slate-500 sm:text-base">
                  {format(anchor, "yyyy")}
                </span>
              </div>

              <p className="mt-0.5 hidden text-xs text-slate-400 dark:text-slate-500 sm:block">
                Plan your schedule and stay organized
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {!isCurrentMonth && (
              <button
                type="button"
                onClick={goToday}
                className="hidden h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 active:scale-[0.97] dark:border-white/[0.09] dark:bg-white/[0.03] dark:text-slate-300 dark:hover:bg-white/[0.07] dark:hover:text-white sm:block"
              >
                Today
              </button>
            )}

            <div className="flex h-9 items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-white/[0.09] dark:bg-white/[0.04]">
              <button
                type="button"
                onClick={previousMonth}
                aria-label="Previous month"
                className="grid h-8 w-8 place-items-center rounded-md text-slate-500 transition-all hover:bg-white hover:text-slate-900 hover:shadow-sm active:scale-90 dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-white"
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  className="h-4 w-4"
                >
                  <path
                    d="M12.5 4.5 7 10l5.5 5.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              <button
                type="button"
                onClick={nextMonth}
                aria-label="Next month"
                className="grid h-8 w-8 place-items-center rounded-md text-slate-500 transition-all hover:bg-white hover:text-slate-900 hover:shadow-sm active:scale-90 dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-white"
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  className="h-4 w-4"
                >
                  <path
                    d="m7.5 4.5 5.5 5.5-5.5 5.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* ─────────────── Calendar ─────────────── */}
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Weekdays */}
          <div className="grid shrink-0 grid-cols-7 border-b border-slate-100 dark:border-white/[0.07]">
            {WEEKDAYS.map((day, index) => (
              <div
                key={day}
                className={cn(
                  "px-2 py-3 text-center text-[10px] font-bold uppercase tracking-[0.12em] sm:py-3.5 sm:text-[11px]",
                  index >= 5
                    ? "text-slate-300 dark:text-slate-700"
                    : "text-slate-400 dark:text-slate-500"
                )}
              >
                <span className="sm:hidden">{day.slice(0, 1)}</span>
                <span className="hidden sm:inline">{day}</span>
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6">
            {days.map((day, index) => {
              const dayEvents = eventsByDate.get(day.iso) ?? [];
              const visibleEvents = dayEvents.slice(0, MAX_EVENTS_DESKTOP);
              const remainingEvents =
                dayEvents.length - visibleEvents.length;

              const isWeekend = index % 7 >= 5;

              return (
                <div
                  key={day.iso}
                  className={cn(
                    "group relative flex min-h-0 flex-col overflow-hidden border-b border-r border-slate-100 p-1.5 transition-colors last:border-r-0 dark:border-white/[0.055] sm:p-2",
                    "hover:bg-slate-50/70 dark:hover:bg-white/[0.025]",
                    !day.inCurrentMonth &&
                      "bg-slate-50/45 dark:bg-white/[0.008]",
                    isWeekend &&
                      day.inCurrentMonth &&
                      "bg-slate-50/30 dark:bg-white/[0.006]"
                  )}
                >
                  {/* Today indicator */}
                  {day.isToday && (
                    <div
                      aria-hidden
                      className="absolute inset-0 rounded-none bg-brand-500/[0.025] ring-1 ring-inset ring-brand-500/20 dark:bg-brand-400/[0.04] dark:ring-brand-400/20"
                    />
                  )}

                  {/* Date */}
                  <div className="relative flex shrink-0 items-center justify-between">
                    <span
                      className={cn(
                        "grid h-7 min-w-7 place-items-center rounded-full px-1 text-xs font-semibold tabular-nums transition-all sm:h-8 sm:min-w-8 sm:text-[13px]",
                        day.isToday
                          ? "bg-brand-600 text-white shadow-[0_3px_10px_rgba(0,0,0,0.14)] dark:bg-brand-500"
                          : day.inCurrentMonth
                            ? "text-slate-700 dark:text-slate-300"
                            : "text-slate-300 dark:text-slate-700"
                      )}
                    >
                      {format(day.date, "d")}
                    </span>

                    {/* Mobile event count */}
                    {dayEvents.length > 0 && (
                      <span className="mr-0.5 text-[9px] font-semibold text-slate-400 sm:hidden dark:text-slate-600">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  {/* Events */}
                  <div className="relative mt-1.5 min-h-0 flex-1 overflow-hidden sm:mt-2">
                    {/* Mobile dots */}
                    <div className="flex flex-wrap gap-1 sm:hidden">
                      {dayEvents.slice(0, 5).map((event) => (
                        <span
                          key={event.id}
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            event.kind === "lecture"
                              ? "bg-brand-500 dark:bg-brand-400"
                              : "bg-amber-500 dark:bg-amber-400"
                          )}
                        />
                      ))}
                    </div>

                    {/* Desktop events */}
                    <div className="hidden space-y-1 sm:block">
                      {visibleEvents.map((event) => (
                        <Link
                          key={event.id}
                          href={event.href}
                          title={event.title}
                          className={cn(
                            "group/event flex w-full min-w-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-[10px] font-medium leading-tight transition-all",
                            event.kind === "lecture"
                              ? "bg-brand-50 text-brand-700 hover:bg-brand-100 hover:shadow-sm dark:bg-brand-500/[0.12] dark:text-brand-200 dark:hover:bg-brand-500/[0.2]"
                              : "bg-amber-50 text-amber-700 hover:bg-amber-100 hover:shadow-sm dark:bg-amber-500/[0.12] dark:text-amber-200 dark:hover:bg-amber-500/[0.2]"
                          )}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 shrink-0 rounded-full",
                              event.kind === "lecture"
                                ? "bg-brand-500"
                                : "bg-amber-500"
                            )}
                          />

                          <span className="min-w-0 truncate">
                            {event.title}
                          </span>
                        </Link>
                      ))}

                      {remainingEvents > 0 && (
                        <button
                          type="button"
                          className="px-2 pt-0.5 text-[10px] font-semibold text-slate-400 transition-colors hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300"
                        >
                          +{remainingEvents} more
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Bottom today accent */}
                  {day.isToday && (
                    <div className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-brand-500 sm:w-10" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ─────────────── Footer ─────────────── */}
        <footer className="flex shrink-0 items-center justify-between border-t border-slate-100 px-4 py-3 dark:border-white/[0.07] sm:px-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-brand-500" />
              <span className="text-[10px] font-medium text-slate-500 sm:text-xs dark:text-slate-400">
                Lecture
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-[10px] font-medium text-slate-500 sm:text-xs dark:text-slate-400">
                Event
              </span>
            </div>
          </div>

          <span className="text-[10px] font-medium text-slate-400 sm:text-xs dark:text-slate-500">
            {events.length} {events.length === 1 ? "event" : "events"}
          </span>
        </footer>
      </div>
    </section>
  );
}
