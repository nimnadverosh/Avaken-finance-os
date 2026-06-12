"use client";

import { AlertTriangle, Info, Sparkles, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { Insight } from "@/lib/data/types";
import { cn } from "@/lib/utils";

const SEVERITY_STYLES = {
  positive: {
    icon: TrendingUp,
    color: "#10b981",
    chip: "bg-positive/12 text-positive ring-positive/20",
  },
  warning: {
    icon: AlertTriangle,
    color: "#f59e0b",
    chip: "bg-warning/12 text-warning ring-warning/20",
  },
  info: {
    icon: Info,
    color: "#38bdf8",
    chip: "bg-info/12 text-info ring-info/20",
  },
} as const;

export function AffiliateInsightsList({
  insights,
  compact = false,
  emptyMessage = "Upload monthly reports to generate insights.",
}: {
  insights: Insight[];
  compact?: boolean;
  emptyMessage?: string;
}) {
  if (insights.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-white/[0.02] px-5 py-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("divide-y divide-border/60", compact ? "" : "rounded-xl ring-1 ring-white/5")}>
      {insights.map((ins) => {
        const s = SEVERITY_STYLES[ins.severity];
        const Icon = s.icon;
        return (
          <div
            key={ins.id}
            className={cn(
              "flex gap-3 bg-white/[0.015]",
              compact ? "px-0 py-3 first:pt-0" : "px-4 py-4",
            )}
          >
            <div
              className="grid size-8 shrink-0 place-items-center rounded-lg ring-1"
              style={{
                background: `${s.color}1a`,
                color: s.color,
                boxShadow: `inset 0 0 0 1px ${s.color}33`,
              }}
            >
              <Icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">{ins.title}</p>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1",
                    s.chip,
                  )}
                >
                  {ins.tag}
                </span>
              </div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{ins.body}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AffiliateInsightsSection({ insights }: { insights: Insight[] }) {
  return (
    <Card className="overflow-hidden rounded-2xl border border-primary/20 bg-card/80 shadow-[0_8px_32px_-12px_rgba(16,185,129,0.12)] backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-violet/30 to-emerald/20 ring-1 ring-violet/25">
            <Sparkles className="size-4 text-violet" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Insights</h3>
            <p className="text-[11px] text-subtle">From your uploaded TikTok earnings data</p>
          </div>
        </div>
        <span className="rounded-full bg-emerald/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald ring-1 ring-emerald/20">
          {insights.length} insight{insights.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="p-4">
        <AffiliateInsightsList insights={insights} />
      </div>
    </Card>
  );
}
