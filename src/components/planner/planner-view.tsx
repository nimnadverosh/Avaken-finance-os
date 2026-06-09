"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Command,
  Plus,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PlannerProvider, usePlanner } from "@/lib/planner/store";
import { DragProvider } from "@/lib/planner/drag-context";
import {
  addDayKey,
  dayLabel,
  daySubLabel,
  isTodayKey,
  todayKey,
  type DayKey,
} from "@/lib/planner/dates";
import { BrainDump } from "./brain-dump";
import { DayColumn } from "./day-column";
import { TimeboxRail } from "./timebox-rail";
import { FocusMode } from "./focus-mode";
import { QuickAdd } from "./quick-add";

const BOARD_COLUMNS = 3;
const STRIP_DAYS = 7;

function PlannerInner() {
  const { hydrated, tasksForDay } = usePlanner();
  const [anchor, setAnchor] = useState<DayKey>(() => todayKey());
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);

  const boardDays = useMemo(
    () => Array.from({ length: BOARD_COLUMNS }, (_, i) => addDayKey(anchor, i)),
    [anchor],
  );
  const stripDays = useMemo(
    () => Array.from({ length: STRIP_DAYS }, (_, i) => addDayKey(todayKey(), i)),
    [],
  );

  const startFocus = useCallback((id: string) => setFocusTaskId(id), []);

  const focusFirstToday = useCallback(() => {
    const next = tasksForDay(todayKey()).find((t) => !t.done);
    setFocusTaskId(next ? next.id : null);
  }, [tasksForDay]);

  // Global keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      const typing = tag === "input" || tag === "textarea" || tag === "select";
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setQuickOpen((o) => !o);
        return;
      }
      if (typing) return;
      if (e.key.toLowerCase() === "f" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        focusFirstToday();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusFirstToday]);

  if (!hydrated) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-sm text-subtle">
        Loading your planner…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            <span className="text-gradient">Daily Planner</span>
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Brain dump, timebox, and focus — one calm place to run your day.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setQuickOpen(true)}
            className="flex h-9 items-center gap-2 rounded-lg border border-border-strong bg-white/[0.02] px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <Plus className="size-4" />
            Quick add
            <span className="ml-1 flex items-center gap-0.5 rounded border border-border-strong bg-white/[0.04] px-1 py-0.5 text-[10px]">
              <Command className="size-2.5" />K
            </span>
          </button>
          <button
            onClick={focusFirstToday}
            className="flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-[0_8px_24px_-8px_rgba(16,185,129,0.6)] transition-colors hover:bg-emerald"
          >
            <Target className="size-4" />
            Focus
          </button>
        </div>
      </div>

      {/* Date strip */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setAnchor((a) => addDayKey(a, -1))}
          aria-label="Previous day"
          className="grid size-8 shrink-0 place-items-center rounded-lg border border-border/70 bg-white/[0.02] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
        </button>

        <div className="flex flex-1 items-center gap-1.5 overflow-x-auto pb-0.5">
          {stripDays.map((d) => {
            const active = d === anchor;
            const inBoard = boardDays.includes(d);
            const count = tasksForDay(d).filter((t) => !t.done).length;
            return (
              <button
                key={d}
                onClick={() => setAnchor(d)}
                className={cn(
                  "group flex shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 transition-all",
                  active
                    ? "border-primary/40 bg-primary/[0.08]"
                    : inBoard
                      ? "border-border-strong bg-white/[0.03]"
                      : "border-border/60 bg-white/[0.01] hover:bg-white/[0.03]",
                )}
              >
                <div className="text-left">
                  <div
                    className={cn(
                      "text-xs font-semibold leading-tight",
                      active ? "text-primary" : isTodayKey(d) ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {dayLabel(d)}
                  </div>
                  <div className="text-[10px] leading-tight text-subtle">{daySubLabel(d)}</div>
                </div>
                {count > 0 && (
                  <span
                    className={cn(
                      "grid size-4 place-items-center rounded-full text-[9px] font-semibold tabular",
                      active ? "bg-primary/20 text-primary" : "bg-white/[0.06] text-muted-foreground",
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setAnchor(todayKey())}
          className="shrink-0 rounded-lg border border-border/70 bg-white/[0.02] px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Today
        </button>
        <button
          onClick={() => setAnchor((a) => addDayKey(a, 1))}
          aria-label="Next day"
          className="grid size-8 shrink-0 place-items-center rounded-lg border border-border/70 bg-white/[0.02] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Three-pane workspace */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[260px_minmax(0,1fr)_300px] lg:h-[calc(100vh-15rem)]">
        {/* Brain dump */}
        <div className="rounded-2xl border border-border/60 bg-card/40 p-3 lg:overflow-hidden">
          <BrainDump />
        </div>

        {/* Board */}
        <div className="flex gap-3 overflow-x-auto lg:overflow-hidden">
          {boardDays.map((d) => (
            <div key={d} className="min-w-[240px] flex-1 lg:min-w-0">
              <DayColumn dayKey={d} onFocus={startFocus} />
            </div>
          ))}
        </div>

        {/* Timebox rail */}
        <div className="rounded-2xl border border-border/60 bg-card/40 p-3 lg:overflow-hidden">
          <TimeboxRail dayKey={anchor} onFocus={startFocus} />
        </div>
      </div>

      {/* Overlays */}
      {focusTaskId !== null && (
        <FocusMode
          taskId={focusTaskId}
          onChangeTask={setFocusTaskId}
          onExit={() => setFocusTaskId(null)}
        />
      )}
      <QuickAdd open={quickOpen} onClose={() => setQuickOpen(false)} />
    </div>
  );
}

export function PlannerView() {
  return (
    <PlannerProvider>
      <DragProvider>
        <PlannerInner />
      </DragProvider>
    </PlannerProvider>
  );
}
