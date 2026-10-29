import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  isSameMonth,
  isSameDay,
} from "date-fns";

export interface CalendarDay {
  date: Date;
  iso: string;
  inCurrentMonth: boolean;
  isToday: boolean;
}

// Builds a full 6-week grid for the month containing `anchor`, including
// the trailing/leading days from adjacent months so the grid is always
// rectangular (standard calendar UI behavior).
export function buildMonthGrid(anchor: Date): CalendarDay[] {
  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: CalendarDay[] = [];
  let cursor = gridStart;
  const today = new Date();

  while (cursor <= gridEnd) {
    days.push({
      date: cursor,
      iso: format(cursor, "yyyy-MM-dd"),
      inCurrentMonth: isSameMonth(cursor, anchor),
      isToday: isSameDay(cursor, today),
    });
    cursor = addDays(cursor, 1);
  }

  return days;
}
