import type { DayKey } from "./dates";

export type EnergyLevel = "high" | "medium" | "low";

export type Recurrence = "none" | "daily" | "weekdays" | "weekly";

export type TaskTag =
  | "deep"
  | "admin"
  | "finance"
  | "personal"
  | "health"
  | "errand";

export interface FinanceLink {
  /** Display label shown on the chip, e.g. "Review Tide balance". */
  label: string;
  /** App route the task deep-links to, e.g. "/dashboard". */
  href: string;
}

export interface PlannerTask {
  id: string;
  title: string;
  notes?: string;
  done: boolean;
  /** Estimated duration in minutes. */
  duration: number;
  /**
   * The day this task lives on. `null` means it sits in the Brain Dump inbox,
   * unassigned to any day.
   */
  day: DayKey | null;
  /**
   * Minutes-from-midnight when the task is timeboxed on its day. `null` means
   * it's in the day's loose list (not pinned to a slot on the timeline).
   */
  startMinutes: number | null;
  energy: EnergyLevel | null;
  recurrence: Recurrence;
  tag: TaskTag | null;
  financeLink: FinanceLink | null;
  /** Sort order within its container (inbox or a given day). */
  order: number;
  createdAt: number;
  completedAt: number | null;
}

export type NewTaskInput = Partial<
  Omit<PlannerTask, "id" | "createdAt" | "completedAt" | "done" | "order">
> & { title: string };

export interface PlannerState {
  tasks: PlannerTask[];
  /** Self-reported energy per day, keyed by DayKey. */
  energyByDay: Record<string, EnergyLevel>;
  /** Total completed pomodoro focus sessions (lifetime). */
  pomodoroCount: number;
}
