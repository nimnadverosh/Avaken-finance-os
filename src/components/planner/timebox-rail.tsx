"use client";

import { useState } from "react";
import { CalendarClock, CircleCheck, Flame, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlanner } from "@/lib/planner/store";
import { useDrag } from "@/lib/planner/drag-context";
import {
  fullDayLabel,
  minutesToClock,
  formatDuration,
  type DayKey,
} from "@/lib/planner/dates";
import {
  ENERGY_META,
  ENERGY_OPTIONS,
  SLOT_MINUTES,
  TAG_META,
  TIMEBOX_END_HOUR,
  TIMEBOX_START_HOUR,
} from "@/lib/planner/ui";
import { Pomodoro } from "./pomodoro";

const START = TIMEBOX_START_HOUR * 60;
const END = TIMEBOX_END_HOUR * 60;
const PX_PER_MIN = 1; // 60px per hour

export function TimeboxRail({
  dayKey,
  onFocus,
}: {
  dayKey: DayKey;
  onFocus: (id: string) => void;
}) {
  const { scheduledForDay, tasksForDay, moveTask, energyByDay, setEnergy } = usePlanner();
  const { draggingId, endDrag } = useDrag();
  const [dropMinutes, setDropMinutes] = useState<number | null>(null);

  const scheduled = scheduledForDay(dayKey);
  const dayTasks = tasksForDay(dayKey);
  const completed = dayTasks.filter((t) => t.done);
  const remaining = dayTasks.filter((t) => !t.done);
  const focusMinutes = remaining.reduce((s, t) => s + t.duration, 0);
  const energy = energyByDay[dayKey];

  const hours = Array.from(
    { length: TIMEBOX_END_HOUR - TIMEBOX_START_HOUR + 1 },
    (_, i) => TIMEBOX_START_HOUR + i,
  );

  const minutesFromEvent = (e: React.DragEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const raw = START + y / PX_PER_MIN;
    const snapped = Math.round(raw / SLOT_MINUTES) * SLOT_MINUTES;
    return Math.min(Math.max(snapped, START), END - SLOT_MINUTES);
  };

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto pr-0.5">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <Stat
          icon={<CircleCheck className="size-3.5 text-primary" />}
          label="Done today"
          value={`${completed.length}`}
          sub={`of ${dayTasks.length}`}
        />
        <Stat
          icon={<CalendarClock className="size-3.5 text-info" />}
          label="Focus left"
          value={formatDuration(focusMinutes || 0)}
          sub={`${remaining.length} tasks`}
        />
      </div>

      {/* Energy tracker */}
      <div className="rounded-xl border border-border/60 bg-white/[0.02] p-3">
        <div className="flex items-center gap-1.5 pb-2">
          <Zap className="size-3.5 text-warning" />
          <span className="text-xs font-medium">Energy check-in</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {ENERGY_OPTIONS.map((e) => {
            const m = ENERGY_META[e];
            const active = energy === e;
            return (
              <button
                key={e}
                onClick={() => setEnergy(dayKey, e)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border py-2 transition-all",
                  active
                    ? "border-transparent"
                    : "border-border/60 bg-white/[0.01] hover:bg-white/[0.04]",
                )}
                style={active ? { background: `${m.color}1f`, boxShadow: `inset 0 0 0 1px ${m.color}55` } : undefined}
              >
                <span className="flex items-center gap-0.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="size-1 rounded-full"
                      style={{ background: i < m.dots ? m.color : "rgba(255,255,255,0.15)" }}
                    />
                  ))}
                </span>
                <span
                  className="text-[10px] font-medium"
                  style={{ color: active ? m.color : undefined }}
                >
                  {m.label}
                </span>
              </button>
            );
          })}
        </div>
        {energy && (
          <p className="mt-2 text-[11px] text-subtle">
            {energy === "high"
              ? "Great — tackle a deep work block now."
              : energy === "medium"
                ? "Steady. Pair admin with a small win."
                : "Low battery — pick one tiny task. That's enough."}
          </p>
        )}
      </div>

      {/* Pomodoro */}
      <Pomodoro variant="rail" />

      {/* Timeline */}
      <div className="rounded-xl border border-border/60 bg-white/[0.02] p-3">
        <div className="flex items-center justify-between pb-2">
          <span className="text-xs font-medium">{fullDayLabel(dayKey).split(",")[0]}</span>
          <span className="text-[10px] text-subtle">{scheduled.length} timeboxed</span>
        </div>

        <div
          className="relative"
          style={{ height: (END - START) * PX_PER_MIN }}
          onDragOver={(e) => {
            if (!draggingId) return;
            e.preventDefault();
            setDropMinutes(minutesFromEvent(e));
          }}
          onDragLeave={() => setDropMinutes(null)}
          onDrop={(e) => {
            e.preventDefault();
            const id = e.dataTransfer.getData("text/plain");
            const minutes = minutesFromEvent(e);
            if (id) moveTask(id, { day: dayKey, startMinutes: minutes });
            setDropMinutes(null);
            endDrag();
          }}
        >
          {/* Hour gridlines */}
          {hours.map((h) => (
            <div
              key={h}
              className="absolute inset-x-0 flex items-start gap-2"
              style={{ top: (h * 60 - START) * PX_PER_MIN }}
            >
              <span className="-mt-1.5 w-8 shrink-0 text-right text-[9px] tabular text-subtle">
                {String(h).padStart(2, "0")}:00
              </span>
              <div className="mt-0.5 h-px flex-1 bg-white/[0.05]" />
            </div>
          ))}

          {/* Drop indicator */}
          {dropMinutes !== null && (
            <div
              className="pointer-events-none absolute inset-x-0 left-10 z-10 flex items-center gap-1"
              style={{ top: (dropMinutes - START) * PX_PER_MIN }}
            >
              <span className="rounded bg-primary px-1 py-0.5 text-[9px] font-semibold tabular text-primary-foreground">
                {minutesToClock(dropMinutes)}
              </span>
              <div className="h-0.5 flex-1 rounded-full bg-primary" />
            </div>
          )}

          {/* Scheduled blocks */}
          <div className="absolute inset-y-0 left-10 right-0">
            {scheduled.map((t) => {
              const top = ((t.startMinutes ?? START) - START) * PX_PER_MIN;
              const height = Math.max(t.duration * PX_PER_MIN, 22);
              const tag = t.tag ? TAG_META[t.tag] : null;
              const accent = tag?.color ?? "#8b909e";
              return (
                <button
                  key={t.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", t.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onClick={() => !t.done && onFocus(t.id)}
                  className={cn(
                    "absolute left-0 right-1 overflow-hidden rounded-lg border px-2 py-1 text-left transition-all hover:brightness-125",
                    t.done && "opacity-50",
                  )}
                  style={{
                    top,
                    height,
                    background: `${accent}1a`,
                    borderColor: `${accent}40`,
                  }}
                >
                  <div className="flex items-center gap-1">
                    <span className="h-full w-0.5 shrink-0 rounded-full" style={{ background: accent }} />
                    <span className={cn("truncate text-[11px] font-medium", t.done && "line-through")}>
                      {t.title}
                    </span>
                  </div>
                  {height > 30 && (
                    <span className="text-[9px] tabular text-subtle">
                      {minutesToClock(t.startMinutes ?? 0)} · {formatDuration(t.duration)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {scheduled.length === 0 && (
          <p className="pt-1 text-center text-[11px] text-subtle">
            Drag tasks here to timebox your day.
          </p>
        )}
      </div>

      {/* Momentum */}
      <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-gradient-to-br from-warning/[0.06] to-transparent p-3">
        <Flame className="size-4 text-warning" />
        <div>
          <p className="text-xs font-medium">
            {completed.length === 0
              ? "Start small to build momentum"
              : `${completed.length} done — keep the streak alive`}
          </p>
          <p className="text-[11px] text-subtle">
            {dayTasks.length > 0
              ? `${Math.round((completed.length / dayTasks.length) * 100)}% of today complete`
              : "Add your first task for today"}
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-white/[0.02] p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-subtle">
        {icon}
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-lg font-semibold tabular tracking-tight">{value}</span>
        <span className="text-[10px] text-subtle">{sub}</span>
      </div>
    </div>
  );
}
