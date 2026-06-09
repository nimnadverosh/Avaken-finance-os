"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { usePlanner } from "@/lib/planner/store";
import { useDrag } from "@/lib/planner/drag-context";
import { dayLabel, daySubLabel, isTodayKey, type DayKey } from "@/lib/planner/dates";
import { TaskItem } from "./task-item";

export function DayColumn({ dayKey }: { dayKey: DayKey }) {
  const { tasksForDay, addTask, moveTask, reorderTask } = usePlanner();
  const { draggingId, endDrag } = useDrag();
  const [dropActive, setDropActive] = useState(false);
  const [draft, setDraft] = useState("");

  const tasks = tasksForDay(dayKey);
  const isToday = isTodayKey(dayKey);

  const handleColumnDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (id) moveTask(id, dayKey);
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
  };

  return (
    <div className="flex h-full min-w-0 flex-col">
      {/* Header — just day name + date */}
      <div className="flex items-baseline gap-2 px-2 pb-3">
        <span
          className={cn(
            "text-[15px] font-semibold tracking-tight",
            isToday ? "text-primary" : "text-foreground",
          )}
        >
          {dayLabel(dayKey)}
        </span>
        <span className="text-xs text-subtle">{daySubLabel(dayKey)}</span>
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
        className={cn(
          "flex-1 space-y-0.5 overflow-y-auto rounded-xl py-1 transition-colors",
          dropActive && "bg-primary/[0.03] ring-1 ring-inset ring-primary/20",
        )}
      >
        {tasks.map((t) => (
          <div key={t.id} onDrop={(e) => handleItemDrop(e, t.id)}>
            <TaskItem task={t} />
          </div>
        ))}

        {/* Inline add — quiet until focused */}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={submitDraft}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              submitDraft();
              (e.target as HTMLInputElement).focus();
            }
            if (e.key === "Escape") {
              setDraft("");
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder="+ Add a task"
          className="w-full rounded-xl bg-transparent px-2 py-2 text-[15px] text-foreground outline-none transition-colors placeholder:text-subtle hover:bg-white/[0.02] focus:bg-white/[0.03]"
        />
      </div>
    </div>
  );
}
