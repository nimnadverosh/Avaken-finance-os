"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlanner } from "@/lib/planner/store";
import { useDrag } from "@/lib/planner/drag-context";
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
      <div className="flex items-center gap-2 px-2 pb-4">
        <span className="text-base" aria-hidden>🧠</span>
        <h2 className="text-sm font-medium tracking-tight text-muted-foreground">Brain Dump</h2>
      </div>

      {/* Quick add */}
      <div className="relative px-2">
        <Plus className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-subtle" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Add a task…"
          className="h-11 w-full rounded-xl border border-border/60 bg-transparent pl-9 pr-3 text-[15px] text-foreground outline-none transition-colors placeholder:text-subtle focus:border-primary/40"
        />
      </div>

      {/* List + drop zone */}
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
        onDrop={(e) => {
          e.preventDefault();
          const id = e.dataTransfer.getData("text/plain");
          if (id) moveTask(id, null);
          setDropActive(false);
          endDrag();
        }}
        className={cn(
          "mt-3 flex-1 space-y-0.5 overflow-y-auto rounded-xl px-1 py-1 transition-colors",
          dropActive && "bg-primary/[0.04] ring-1 ring-inset ring-primary/20",
        )}
      >
        {tasks.length === 0 ? (
          <p className="px-3 pt-6 text-center text-[13px] leading-relaxed text-subtle">
            Your mind is clear.
            <br />
            Dump a thought, then drag it onto a day.
          </p>
        ) : (
          tasks.map((t) => <TaskItem key={t.id} task={t} />)
        )}
      </div>
    </div>
  );
}
