"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  GripVertical,
  Link2,
  Repeat,
  Target,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlanner } from "@/lib/planner/store";
import { useDrag } from "@/lib/planner/drag-context";
import { formatDuration } from "@/lib/planner/dates";
import {
  DURATION_PRESETS,
  ENERGY_META,
  ENERGY_OPTIONS,
  TAG_META,
  TAG_OPTIONS,
} from "@/lib/planner/ui";
import type { PlannerTask, Recurrence } from "@/lib/planner/types";

const RECURRENCE_LABEL: Record<Recurrence, string> = {
  none: "Once",
  daily: "Daily",
  weekdays: "Weekdays",
  weekly: "Weekly",
};

export function TaskItem({
  task,
  variant = "day",
  onFocus,
}: {
  task: PlannerTask;
  variant?: "inbox" | "day";
  onFocus?: (id: string) => void;
}) {
  const { toggleDone, updateTask, deleteTask } = usePlanner();
  const { startDrag, endDrag } = useDrag();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => setTitle(task.title), [task.title]);

  const commitTitle = () => {
    const trimmed = title.trim();
    if (trimmed && trimmed !== task.title) updateTask(task.id, { title: trimmed });
    else setTitle(task.title);
    setEditing(false);
  };

  const tag = task.tag ? TAG_META[task.tag] : null;
  const energy = task.energy ? ENERGY_META[task.energy] : null;

  return (
    <div
      draggable={!editing}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", task.id);
        e.dataTransfer.effectAllowed = "move";
        startDrag(task.id);
      }}
      onDragEnd={endDrag}
      data-task-id={task.id}
      className={cn(
        "group/task relative rounded-xl border border-border/70 bg-white/[0.02] p-2.5 transition-all",
        "hover:border-border-strong hover:bg-white/[0.04]",
        task.done && "opacity-55",
        editing && "border-border-strong bg-white/[0.05] ring-1 ring-primary/30",
      )}
    >
      <div className="flex items-start gap-2.5">
        {/* Drag handle */}
        <button
          className="mt-0.5 cursor-grab text-subtle opacity-0 transition-opacity group-hover/task:opacity-100 active:cursor-grabbing"
          tabIndex={-1}
          aria-label="Drag task"
        >
          <GripVertical className="size-3.5" />
        </button>

        {/* Checkbox */}
        <button
          onClick={() => toggleDone(task.id)}
          aria-label={task.done ? "Mark incomplete" : "Mark complete"}
          className={cn(
            "mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-full border transition-all",
            task.done
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border-strong text-transparent hover:border-primary/70 hover:text-primary/40",
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
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitTitle();
                if (e.key === "Escape") {
                  setTitle(task.title);
                  setEditing(false);
                }
              }}
              className="w-full bg-transparent text-sm text-foreground outline-none"
            />
          ) : (
            <button
              onClick={() => setEditing(true)}
              className={cn(
                "block w-full truncate text-left text-sm text-foreground",
                task.done && "line-through decoration-subtle",
              )}
            >
              {task.title}
            </button>
          )}

          {/* Meta row */}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {tag && (
              <span
                className="rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                style={{ background: tag.bg, color: tag.color, boxShadow: `inset 0 0 0 1px ${tag.ring}` }}
              >
                {tag.label}
              </span>
            )}
            <span className="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-medium tabular text-muted-foreground">
              {formatDuration(task.duration)}
            </span>
            {energy && (
              <span className="flex items-center gap-0.5" title={`${energy.label} energy`}>
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="size-1 rounded-full"
                    style={{ background: i < energy.dots ? energy.color : "rgba(255,255,255,0.12)" }}
                  />
                ))}
              </span>
            )}
            {task.recurrence !== "none" && (
              <span className="flex items-center gap-0.5 text-[10px] text-subtle">
                <Repeat className="size-2.5" />
                {RECURRENCE_LABEL[task.recurrence]}
              </span>
            )}
            {task.financeLink && (
              <Link
                href={task.financeLink.href}
                className="flex items-center gap-0.5 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary ring-1 ring-primary/20 transition-colors hover:bg-primary/20"
              >
                <Link2 className="size-2.5" />
                Finance
              </Link>
            )}
          </div>

          {/* Edit controls */}
          {editing && (
            <div className="mt-2.5 space-y-2 border-t border-border/60 pt-2.5">
              <div className="flex flex-wrap items-center gap-1">
                {DURATION_PRESETS.map((d) => (
                  <button
                    key={d}
                    onClick={() => updateTask(task.id, { duration: d })}
                    className={cn(
                      "rounded-md px-1.5 py-0.5 text-[10px] tabular transition-colors",
                      task.duration === d
                        ? "bg-primary/20 text-primary"
                        : "bg-white/[0.04] text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {formatDuration(d)}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {TAG_OPTIONS.map((t) => {
                  const m = TAG_META[t];
                  const active = task.tag === t;
                  return (
                    <button
                      key={t}
                      onClick={() => updateTask(task.id, { tag: active ? null : t })}
                      className="rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-all"
                      style={
                        active
                          ? { background: m.bg, color: m.color, boxShadow: `inset 0 0 0 1px ${m.ring}` }
                          : { background: "rgba(255,255,255,0.04)", color: "#8b909e" }
                      }
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  {ENERGY_OPTIONS.map((e) => {
                    const m = ENERGY_META[e];
                    const active = task.energy === e;
                    return (
                      <button
                        key={e}
                        onClick={() => updateTask(task.id, { energy: active ? null : e })}
                        className={cn(
                          "rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                          active ? "text-foreground" : "text-subtle hover:text-muted-foreground",
                        )}
                        style={active ? { background: `${m.color}22`, color: m.color } : undefined}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>
                <select
                  value={task.recurrence}
                  onChange={(e) => updateTask(task.id, { recurrence: e.target.value as Recurrence })}
                  className="rounded-md border border-border/70 bg-surface px-1.5 py-0.5 text-[10px] text-muted-foreground outline-none"
                >
                  {(Object.keys(RECURRENCE_LABEL) as Recurrence[]).map((r) => (
                    <option key={r} value={r}>
                      {RECURRENCE_LABEL[r]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Hover actions */}
        {!editing && (
          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/task:opacity-100">
            {onFocus && variant === "day" && !task.done && (
              <button
                onClick={() => onFocus(task.id)}
                aria-label="Focus on this task"
                className="grid size-6 place-items-center rounded-md text-subtle transition-colors hover:bg-white/[0.06] hover:text-primary"
              >
                <Target className="size-3.5" />
              </button>
            )}
            <button
              onClick={() => deleteTask(task.id)}
              aria-label="Delete task"
              className="grid size-6 place-items-center rounded-md text-subtle transition-colors hover:bg-negative/10 hover:text-negative"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
