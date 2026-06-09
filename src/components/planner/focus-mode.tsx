"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Check, Link2, SkipForward, X } from "lucide-react";
import { usePlanner } from "@/lib/planner/store";
import { todayKey, formatDuration } from "@/lib/planner/dates";
import { TAG_META } from "@/lib/planner/ui";
import { Pomodoro } from "./pomodoro";

export function FocusMode({
  taskId,
  onChangeTask,
  onExit,
}: {
  taskId: string;
  onChangeTask: (id: string | null) => void;
  onExit: () => void;
}) {
  const { tasks, tasksForDay, toggleDone } = usePlanner();
  const task = tasks.find((t) => t.id === taskId);

  const remainingToday = tasksForDay(todayKey()).filter((t) => !t.done && t.id !== taskId);

  // Escape exits focus mode.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onExit]);

  const advance = () => {
    const next = remainingToday[0];
    onChangeTask(next ? next.id : null);
  };

  const complete = () => {
    if (task) toggleDone(task.id);
    advance();
  };

  const tag = task?.tag ? TAG_META[task.tag] : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-2xl">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(40rem 40rem at 50% 30%, rgba(16,185,129,0.10), transparent 60%)",
        }}
      />

      <button
        onClick={onExit}
        className="absolute right-6 top-6 flex items-center gap-1.5 rounded-lg border border-border/70 bg-white/[0.02] px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="size-3.5" />
        Exit focus
        <span className="ml-1 rounded border border-border-strong bg-white/[0.04] px-1 py-0.5 text-[9px]">
          Esc
        </span>
      </button>

      <div className="flex w-full max-w-md flex-col items-center px-6 text-center">
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-subtle">
          Focusing on
        </span>

        {task ? (
          <>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
              {task.title}
            </h1>
            <div className="mt-3 flex items-center gap-2">
              {tag && (
                <span
                  className="rounded-md px-2 py-0.5 text-[11px] font-medium"
                  style={{ background: tag.bg, color: tag.color }}
                >
                  {tag.label}
                </span>
              )}
              <span className="rounded-md bg-white/[0.05] px-2 py-0.5 text-[11px] tabular text-muted-foreground">
                {formatDuration(task.duration)}
              </span>
              {task.financeLink && (
                <Link
                  href={task.financeLink.href}
                  className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary ring-1 ring-primary/20 hover:bg-primary/20"
                >
                  <Link2 className="size-3" />
                  Open in Finance
                </Link>
              )}
            </div>

            <div className="mt-10">
              <Pomodoro variant="focus" />
            </div>

            <div className="mt-10 flex items-center gap-2">
              <button
                onClick={complete}
                className="flex h-10 items-center gap-2 rounded-xl border border-border-strong bg-white/[0.03] px-5 text-sm font-medium text-foreground transition-colors hover:bg-white/[0.06]"
              >
                <Check className="size-4 text-primary" />
                Complete
              </button>
              {remainingToday.length > 0 && (
                <button
                  onClick={advance}
                  className="flex h-10 items-center gap-2 rounded-xl px-4 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <SkipForward className="size-4" />
                  Next task
                </button>
              )}
            </div>

            {remainingToday.length > 0 && (
              <p className="mt-6 text-[11px] text-subtle">
                Up next: {remainingToday[0].title}
              </p>
            )}
          </>
        ) : (
          <>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">All done for today</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Nothing left in focus. Take a breath — you earned it.
            </p>
            <button
              onClick={onExit}
              className="mt-8 flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-emerald"
            >
              Back to planner
            </button>
          </>
        )}
      </div>
    </div>
  );
}
