import { addDays, endOfWeek, format, isWithinInterval, startOfDay, startOfWeek } from "date-fns";

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

export function nextNDays(n: number): Date[] {
  const start = startOfDay(new Date());
  return Array.from({ length: n }, (_, i) => addDays(start, i));
}
