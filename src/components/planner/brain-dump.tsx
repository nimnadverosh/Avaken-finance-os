"use client";

import { useState } from "react";
import { CornerDownLeft, Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlanner, ROUTINE_SUGGESTIONS } from "@/lib/planner/store";
import { useDrag } from "@/lib/planner/drag-context";
import { todayKey } from "@/lib/planner/dates";
import { TaskItem } from "./task-item";

export function BrainDump() {
  const { inboxTasks, addTask, moveTask } = usePlanner();
  const { draggingId, endDrag } = useDrag();
  const [value, setValue] = useState("");
  const [dropActive, setDropActive] = useState(false);
  const tasks = inboxTasks();

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    addTask({ title: trimmed, day: null });
    setValue("");
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-1 pb-3">
        <span className="text-base" aria-hidden>🧠</span>
        <h2 className="text-sm font-semibold tracking-tight">Brain Dump</h2>
        <span className="ml-auto rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          {tasks.length}
        </span>
      </div>

      {/* Quick add */}
      <div className="relative">
        <Plus className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Add a task…"
          className="h-10 w-full rounded-xl border border-border/70 bg-white/[0.02] pl-9 pr-9 text-sm text-foreground outline-none transition-colors placeholder:text-subtle focus:border-primary/50 focus:bg-white/[0.04]"
        />
        {value.trim() && (
          <button
            onClick={submit}
            aria-label="Add task"
            className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-subtle transition-colors hover:bg-white/[0.06] hover:text-primary"
          >
            <CornerDownLeft className="size-3.5" />
          </button>
        )}
      </div>

      {/* Task list (also a drop zone for un-scheduling) */}
      <div
        onDragOver={(e) => {
          if (draggingId) {
            e.preventDefault();
            setDropActive(true);
          }
        }}
        onDragLeave={() => setDropActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          const id = e.dataTransfer.getData("text/plain");
          if (id) moveTask(id, { day: null, startMinutes: null });
          setDropActive(false);
          endDrag();
        }}
        className={cn(
          "mt-3 flex-1 space-y-1.5 overflow-y-auto rounded-xl p-1 transition-colors",
          dropActive && "bg-primary/[0.04] ring-1 ring-inset ring-primary/30",
        )}
      >
        {tasks.length === 0 ? (
          <div className="flex h-full min-h-32 flex-col items-center justify-center gap-1 px-4 text-center">
            <p className="text-xs text-muted-foreground">Your mind is clear.</p>
            <p className="text-[11px] text-subtle">
              Dump any loose thought here, then drag it onto a day.
            </p>
          </div>
        ) : (
          tasks.map((t) => <TaskItem key={t.id} task={t} variant="inbox" />)
        )}
      </div>

      {/* Routine suggestions */}
      <div className="mt-3 border-t border-border/60 pt-3">
        <div className="flex items-center gap-1.5 px-1 pb-2">
          <Sparkles className="size-3 text-violet" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-subtle">
            Suggested routines
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ROUTINE_SUGGESTIONS.map((r) => (
            <button
              key={r.title}
              onClick={() =>
                addTask({
                  title: r.title,
                  day: todayKey(),
                  duration: r.duration,
                  recurrence: r.recurrence,
                  energy: r.energy,
                  tag: r.tag,
                })
              }
              className="rounded-lg border border-border/70 bg-white/[0.02] px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-violet/40 hover:bg-violet/[0.06] hover:text-foreground"
            >
              + {r.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
