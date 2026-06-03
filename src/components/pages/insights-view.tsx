"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Info, Sparkles, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "./page-header";
import { useEntity } from "@/lib/entity-context";
import { getInsights } from "@/lib/data/queries";
import { cn } from "@/lib/utils";
import type { Insight } from "@/lib/data/types";

const SEVERITY_STYLES = {
  positive: { icon: TrendingUp, color: "#10b981", chip: "bg-positive/12 text-positive ring-positive/20", label: "Positive" },
  warning: { icon: AlertTriangle, color: "#f59e0b", chip: "bg-warning/12 text-warning ring-warning/20", label: "Warning" },
  info: { icon: Info, color: "#38bdf8", chip: "bg-info/12 text-info ring-info/20", label: "Info" },
} as const;

export function InsightsView() {
  const { entity, config } = useEntity();
  const all = getInsights(entity, 20);
  const [filter, setFilter] = useState<Insight["severity"] | "all">("all");
  const filtered = useMemo(
    () => (filter === "all" ? all : all.filter((i) => i.severity === filter)),
    [all, filter],
  );

  const counts = {
    positive: all.filter((i) => i.severity === "positive").length,
    warning: all.filter((i) => i.severity === "warning").length,
    info: all.filter((i) => i.severity === "info").length,
  };

  return (
    <div>
      <PageHeader
        title="AI insights"
        description={`Surface-level intelligence across your ${config.label.toLowerCase()} finances · refreshed continuously`}
        actions={
          <div className="flex items-center gap-0.5 rounded-lg border border-border/80 bg-surface/70 p-0.5">
            {(["all", "positive", "warning", "info"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-medium capitalize transition-colors",
                  filter === f
                    ? "bg-white/[0.07] text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f}
              </button>
            ))}
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-3 gap-3">
        <Summary label="Opportunities" value={counts.positive} accent="#10b981" />
        <Summary label="Warnings" value={counts.warning} accent="#f59e0b" />
        <Summary label="FYI" value={counts.info} accent="#38bdf8" />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {filtered.map((ins) => {
          const s = SEVERITY_STYLES[ins.severity];
          const Icon = s.icon;
          return (
            <Card key={ins.id} className="relative overflow-hidden p-5">
              <div
                className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full opacity-20 blur-2xl"
                style={{ background: s.color }}
              />
              <div className="flex items-center gap-2">
                <div
                  className="grid size-9 place-items-center rounded-lg ring-1"
                  style={{ background: `${s.color}1a`, color: s.color, boxShadow: `inset 0 0 0 1px ${s.color}33` }}
                >
                  <Icon className="size-4" />
                </div>
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium ring-1", s.chip)}>
                  {s.label}
                </span>
                <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] text-muted-foreground ring-1 ring-white/10">
                  {ins.tag}
                </span>
              </div>
              <p className="mt-3 text-base font-semibold tracking-tight">{ins.title}</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{ins.body}</p>
              <div className="mt-4 flex items-center gap-3 text-[11px] text-subtle">
                <span className="inline-flex items-center gap-1">
                  <Sparkles className="size-3 text-violet" />
                  AI-generated
                </span>
                <span>·</span>
                <span>updated 2 min ago</span>
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <Card className="md:col-span-2 p-10 text-center text-sm text-muted-foreground">
            No {filter !== "all" && filter} insights for this entity yet.
          </Card>
        )}
      </div>
    </div>
  );
}

function Summary({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <Card className="relative overflow-hidden p-4">
      <div
        className="pointer-events-none absolute -right-6 -top-6 size-20 rounded-full opacity-25 blur-2xl"
        style={{ background: accent }}
      />
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="tabular mt-1 text-xl font-semibold">{value}</p>
    </Card>
  );
}
