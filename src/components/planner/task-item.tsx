"use client";

import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlanner } from "@/lib/planner/store";
import { useDrag } from "@/lib/planner/drag-context";
import { formatDuration } from "@/lib/planner/dates";
import { DURATION_PRESETS } from "@/lib/planner/types";
import type { PlannerTask } from "@/lib/planner/types";

export function TaskItem({ task }: { task: PlannerTask }) {
  const { toggleDone, updateTask, deleteTask } = usePlanner();
  const { startDrag, endDrag } = useDrag();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    if (!editing) setTitle(task.title);
  }, [task.title, editing]);

  const commit = () => {
    const trimmed = title.trim();
    if (trimmed && trimmed !== task.title) updateTask(task.id, { title: trimmed });
    else setTitle(task.title);
    setEditing(false);
  };

  return (
    <div
      draggable={!editing}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", task.id);
        e.dataTransfer.effectAllowed = "move";
        startDrag(task.id);
      }}
      onDragEnd={endDrag}
      className={cn(
        "group/task flex items-start gap-3 rounded-xl px-2 py-2 transition-colors",
        editing ? "bg-white/[0.04]" : "hover:bg-white/[0.03]",
        !editing && "cursor-grab active:cursor-grabbing",
      )}
    >
      {/* Checkbox */}
      <button
        onClick={() => toggleDone(task.id)}
        aria-label={task.done ? "Mark incomplete" : "Mark complete"}
        className={cn(
          "mt-0.5 grid size-[20px] shrink-0 place-items-center rounded-full border transition-all",
          task.done
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border-strong text-transparent hover:border-primary/70",
        )}
      >
        <Check className="size-3" strokeWidth={3} />
      </button>

      {/* Body */}
      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setTitle(task.title);
                setEditing(false);
              }
            }}
            className="w-full bg-transparent text-[15px] leading-snug text-foreground outline-none"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className={cn(
              "block w-full text-left text-[15px] leading-snug",
              task.done ? "text-subtle line-through" : "text-foreground",
            )}
          >
            {task.title}
          </button>
        )}

        {/* Duration chips only while editing */}
        {editing && (
          <div className="mt-2 flex flex-wrap items-center gap-1">
            {DURATION_PRESETS.map((d) => (
              <button
                key={d}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => updateTask(task.id, { duration: task.duration === d ? null : d })}
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[10px] tabular transition-colors",
                  task.duration === d
                    ? "bg-primary/20 text-primary"
                    : "bg-white/[0.04] text-subtle hover:text-muted-foreground",
                )}
              >
                {formatDuration(d)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Trailing: subtle duration, or delete on hover */}
      <div className="mt-0.5 flex shrink-0 items-center gap-1">
        {!editing && task.duration != null && (
          <span className="text-[11px] tabular text-subtle group-hover/task:hidden">
            {formatDuration(task.duration)}
          </span>
        )}
        {!editing && (
          <button
            onClick={() => deleteTask(task.id)}
            aria-label="Delete task"
            className="hidden size-5 place-items-center rounded-md text-subtle transition-colors hover:text-negative group-hover/task:grid"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
