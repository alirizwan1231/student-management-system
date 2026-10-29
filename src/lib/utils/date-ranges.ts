import {
  addDays, differenceInCalendarDays, endOfDay, endOfWeek, format,
  isWithinInterval, startOfDay, startOfWeek,
} from "date-fns";
export function todayIso(): string {
  return format(new Date(), "yyyy-MM-dd");
}
export function thisWeekRange() {
  const now = new Date();
  return {
    start: startOfWeek(now, { weekStartsOn: 1 }),
    end: endOfWeek(now, { weekStartsOn: 1 }),
  };
}
export function isInThisWeek(dateIso: string | null): boolean {
  if (!dateIso) return false;
  const { start, end } = thisWeekRange();
  return isWithinInterval(new Date(dateIso), { start, end });
}
export function isOverdueDeadline(deadline: string | null, status: string): boolean {
  if (!deadline || status === "completed") return false;
  return new Date(deadline).getTime() < Date.now();
}
// Anything past the end of THIS week (Sunday) and not completed. This is
// the fix for "next week's task stays hidden" -- it's unconditional, not
// capped at "this week".
export function isUpcomingDeadline(deadline: string | null, status: string): boolean {
  if (!deadline || status === "completed") return false;
  const { end } = thisWeekRange();
  return new Date(deadline).getTime() > endOfDay(end).getTime();
}
export function nextNDays(n: number): Date[] {
  const start = startOfDay(new Date());
  return Array.from({ length: n }, (_, i) => addDays(start, i));
}
// "Due today" / "Tomorrow" / "3 days left" / "Next Monday" / "Overdue by 2 days"
export function relativeDeadlineLabel(deadlineIso: string): string {
  const deadline = new Date(deadlineIso);
  const diffDays = differenceInCalendarDays(startOfDay(deadline), startOfDay(new Date()));
  if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"}`;
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays <= 7) return `${diffDays} days left`;
  return `Next ${format(deadline, "EEEE")}`;
}
