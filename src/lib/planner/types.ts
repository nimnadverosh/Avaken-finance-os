import type { DayKey } from "./dates";

export interface PlannerTask {
  id: string;
  title: string;
  done: boolean;
  /** Optional estimate in minutes. `null` = no duration shown (the calm default). */
  duration: number | null;
  /** The day this task lives on. `null` means it sits in the Brain Dump inbox. */
  day: DayKey | null;
  /** Sort order within its container (inbox or a given day). */
  order: number;
  createdAt: number;
  completedAt: number | null;
}

export type NewTaskInput = {
  title: string;
  day?: DayKey | null;
  duration?: number | null;
};

export interface PlannerState {
  tasks: PlannerTask[];
}

/** Quick duration presets (minutes), only offered while editing a task. */
export const DURATION_PRESETS = [15, 30, 45, 60, 90];
