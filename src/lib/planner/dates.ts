import {
  addDays,
  differenceInCalendarDays,
  format,
  isToday,
  isTomorrow,
  parseISO,
  startOfDay,
} from "date-fns";

/** A day key in `YYYY-MM-DD` local format — the canonical identifier for a planner day. */
export type DayKey = string;

export function toDayKey(date: Date): DayKey {
  return format(startOfDay(date), "yyyy-MM-dd");
}

export function fromDayKey(key: DayKey): Date {
  return startOfDay(parseISO(key));
}

export function todayKey(): DayKey {
  return toDayKey(new Date());
}

export function addDayKey(key: DayKey, amount: number): DayKey {
  return toDayKey(addDays(fromDayKey(key), amount));
}

/** Short, human label for a day column header — "Today", "Tomorrow", or "Wed". */
export function dayLabel(key: DayKey): string {
  const date = fromDayKey(key);
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "EEE");
}

export function daySubLabel(key: DayKey): string {
  return format(fromDayKey(key), "d MMM");
}

export function fullDayLabel(key: DayKey): string {
  return format(fromDayKey(key), "EEEE, d MMMM");
}

export function isTodayKey(key: DayKey): boolean {
  return isToday(fromDayKey(key));
}

export function relativeDays(key: DayKey): number {
  return differenceInCalendarDays(fromDayKey(key), startOfDay(new Date()));
}

/** Returns `count` consecutive day keys starting from `start`. */
export function dayRange(start: DayKey, count: number): DayKey[] {
  return Array.from({ length: count }, (_, i) => addDayKey(start, i));
}

/** Formats minutes-from-midnight as a 24h `HH:mm` clock label. */
export function minutesToClock(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Formats a duration in minutes as a compact label — "30m", "1h", "1h 30m". */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
