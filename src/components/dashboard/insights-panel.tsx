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

export function InsightsPanel({ insights }: { insights: Insight[] }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-violet/30 to-info/20 ring-1 ring-violet/25">
            <Sparkles className="size-3.5 text-violet" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight">AI insights</h3>
            <p className="text-[11px] text-subtle">Updated 2 min ago</p>
          </div>
        </div>
        <span className="rounded-full bg-violet/10 px-2 py-0.5 text-[10px] font-medium text-violet ring-1 ring-violet/20">
          {insights.length} new
        </span>
      </div>

      <div className="divide-y divide-border/60">
        {insights.map((ins) => {
          const s = SEVERITY_STYLES[ins.severity];
          const Icon = s.icon;
          return (
            <div key={ins.id} className="flex gap-3 px-5 py-4">
              <div
                className="grid size-8 shrink-0 place-items-center rounded-lg ring-1"
                style={{ background: `${s.color}1a`, color: s.color, boxShadow: `inset 0 0 0 1px ${s.color}33` }}
              >
                <Icon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
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
    </Card>
  );
}
