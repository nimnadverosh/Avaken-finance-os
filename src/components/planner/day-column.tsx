"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlanner } from "@/lib/planner/store";
import { useDrag } from "@/lib/planner/drag-context";
import {
  dayLabel,
  daySubLabel,
  formatDuration,
  isTodayKey,
  type DayKey,
} from "@/lib/planner/dates";
import { TaskItem } from "./task-item";

export function DayColumn({
  dayKey,
  onFocus,
}: {
  dayKey: DayKey;
  onFocus: (id: string) => void;
}) {
  const { tasksForDay, addTask, moveTask, reorderTask } = usePlanner();
  const { draggingId, endDrag } = useDrag();
  const [dropActive, setDropActive] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const tasks = tasksForDay(dayKey);
  const isToday = isTodayKey(dayKey);
  const remaining = tasks.filter((t) => !t.done);
  const totalMinutes = remaining.reduce((sum, t) => sum + t.duration, 0);
  const doneCount = tasks.length - remaining.length;

  const handleColumnDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (id) moveTask(id, { day: dayKey });
    setDropActive(false);
    endDrag();
  };

  const handleItemDrop = (e: React.DragEvent, beforeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const id = e.dataTransfer.getData("text/plain");
    if (id && id !== beforeId) reorderTask(id, dayKey, beforeId);
    setDropActive(false);
    endDrag();
  };

  const submitDraft = () => {
    const trimmed = draft.trim();
    if (trimmed) addTask({ title: trimmed, day: dayKey });
    setDraft("");
    setAdding(false);
  };

  return (
    <div
      className={cn(
        "flex h-full min-w-0 flex-col rounded-2xl border bg-card/40 transition-colors",
        isToday ? "border-primary/30" : "border-border/60",
        dropActive && "border-primary/60 bg-primary/[0.03]",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 px-3 py-2.5">
        <div className="flex items-baseline gap-1.5">
          <span
            className={cn(
              "text-sm font-semibold tracking-tight",
              isToday ? "text-primary" : "text-foreground",
            )}
          >
            {dayLabel(dayKey)}
          </span>
          <span className="text-[11px] text-subtle">{daySubLabel(dayKey)}</span>
        </div>
        <div className="flex items-center gap-2">
          {totalMinutes > 0 && (
            <span className="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-medium tabular text-muted-foreground">
              {formatDuration(totalMinutes)}
            </span>
          )}
          <button
            onClick={() => setAdding(true)}
            aria-label="Add task to this day"
            className="grid size-6 place-items-center rounded-md text-subtle transition-colors hover:bg-white/[0.06] hover:text-foreground"
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>

      {/* Tasks */}
      <div
        onDragOver={(e) => {
          if (draggingId) {
            e.preventDefault();
            setDropActive(true);
          }
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropActive(false);
        }}
        onDrop={handleColumnDrop}
        className="flex-1 space-y-1.5 overflow-y-auto p-2"
      >
        {tasks.map((t) => (
          <div key={t.id} onDrop={(e) => handleItemDrop(e, t.id)}>
            <TaskItem task={t} variant="day" onFocus={onFocus} />
          </div>
        ))}

        {adding && (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={submitDraft}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitDraft();
              if (e.key === "Escape") {
                setDraft("");
                setAdding(false);
              }
            }}
            placeholder="Task title…"
            className="w-full rounded-xl border border-border-strong bg-white/[0.04] px-2.5 py-2 text-sm text-foreground outline-none placeholder:text-subtle"
          />
        )}

        {tasks.length === 0 && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex min-h-20 w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border/60 text-center text-[11px] text-subtle transition-colors hover:border-border-strong hover:text-muted-foreground"
          >
            <Plus className="size-4" />
            Add or drop a task
          </button>
        )}
      </div>

      {/* Footer progress */}
      {tasks.length > 0 && (
        <div className="border-t border-border/50 px-3 py-2">
          <div className="flex items-center justify-between text-[10px] text-subtle">
            <span>{doneCount}/{tasks.length} done</span>
            <span className="tabular">{Math.round((doneCount / tasks.length) * 100)}%</span>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-emerald transition-all duration-500"
              style={{ width: `${(doneCount / tasks.length) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
