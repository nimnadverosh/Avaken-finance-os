"use client";

import { useEffect, useMemo, useState } from "react";
import { Command, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlannerProvider, usePlanner } from "@/lib/planner/store";
import { DragProvider } from "@/lib/planner/drag-context";
import { addDayKey, fullDayLabel, todayKey, type DayKey } from "@/lib/planner/dates";
import { BrainDump } from "./brain-dump";
import { DayColumn } from "./day-column";
import { QuickAdd } from "./quick-add";

type ViewMode = "day" | "week";

function PlannerInner() {
  const { hydrated } = usePlanner();
  const [view, setView] = useState<ViewMode>("day");
  const [quickOpen, setQuickOpen] = useState(false);

  const days: DayKey[] = useMemo(() => {
    const count = view === "day" ? 3 : 7;
    return Array.from({ length: count }, (_, i) => addDayKey(todayKey(), i));
  }, [view]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setQuickOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!hydrated) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-sm text-subtle">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            <span className="text-gradient">Planner</span>
          </h1>
          <p className="mt-0.5 text-xs text-subtle sm:text-sm">{fullDayLabel(todayKey())}</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Day / Week toggle */}
          <div className="flex items-center rounded-lg border border-border/60 bg-white/[0.02] p-0.5">
            {(["day", "week"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                  view === v ? "bg-white/[0.07] text-foreground" : "text-subtle hover:text-muted-foreground",
                )}
              >
                {v}
              </button>
            ))}
          </div>

          <button
            onClick={() => setQuickOpen(true)}
            className="flex h-9 items-center gap-2 rounded-lg border border-border/60 bg-white/[0.02] px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Add</span>
            <span className="flex items-center gap-0.5 rounded border border-border-strong bg-white/[0.04] px-1 py-0.5 text-[10px]">
              <Command className="size-2.5" />K
            </span>
          </button>
        </div>
      </div>

      {/* Workspace */}
      <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-border/50 bg-card/30 lg:h-[calc(100vh-13rem)] lg:grid-cols-[240px_minmax(0,1fr)]">
        {/* Brain dump */}
        <div className="border-b border-border/50 p-3 lg:border-b-0 lg:border-r lg:overflow-hidden">
          <BrainDump />
        </div>

        {/* Days */}
        <div className="flex divide-x divide-border/40 overflow-x-auto">
          {days.map((d) => (
            <div
              key={d}
              className={cn(
                "min-w-[230px] flex-1 p-3 lg:overflow-y-auto",
                view === "week" && "min-w-[200px]",
              )}
            >
              <DayColumn dayKey={d} />
            </div>
          ))}
        </div>
      </div>

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
