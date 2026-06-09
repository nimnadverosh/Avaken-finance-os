import type { EnergyLevel, TaskTag } from "./types";

export const TAG_META: Record<
  TaskTag,
  { label: string; color: string; bg: string; ring: string }
> = {
  deep: { label: "Deep work", color: "#a78bfa", bg: "rgba(167,139,250,0.12)", ring: "rgba(167,139,250,0.25)" },
  admin: { label: "Admin", color: "#38bdf8", bg: "rgba(56,189,248,0.12)", ring: "rgba(56,189,248,0.25)" },
  finance: { label: "Finance", color: "#10b981", bg: "rgba(16,185,129,0.12)", ring: "rgba(16,185,129,0.25)" },
  personal: { label: "Personal", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", ring: "rgba(245,158,11,0.25)" },
  health: { label: "Health", color: "#34d399", bg: "rgba(52,211,153,0.12)", ring: "rgba(52,211,153,0.25)" },
  errand: { label: "Errand", color: "#f43f5e", bg: "rgba(244,63,94,0.12)", ring: "rgba(244,63,94,0.25)" },
};

export const TAG_OPTIONS = Object.keys(TAG_META) as TaskTag[];

export const ENERGY_META: Record<
  EnergyLevel,
  { label: string; color: string; dots: number }
> = {
  high: { label: "High", color: "#34d399", dots: 3 },
  medium: { label: "Medium", color: "#f59e0b", dots: 2 },
  low: { label: "Low", color: "#38bdf8", dots: 1 },
};

export const ENERGY_OPTIONS = ["high", "medium", "low"] as const;

/** Quick duration presets (minutes) offered in the UI. */
export const DURATION_PRESETS = [15, 30, 45, 60, 90];

/** Timebox timeline configuration (right rail). */
export const TIMEBOX_START_HOUR = 6;
export const TIMEBOX_END_HOUR = 23;
export const SLOT_MINUTES = 30;
export const SLOT_PX = 30;
