"use client";

import { cn } from "@/lib/utils";
import type { TikTokViewPeriod } from "@/lib/tiktok/period";

/** Dashboard time window for TikTok commission metrics. */
export type Period = TikTokViewPeriod;

const PERIODS: { id: Period; label: string; hint: string }[] = [
  { id: "all", label: "All", hint: "Every uploaded month combined" },
  { id: "latest", label: "Latest", hint: "Most recent uploaded month" },
  { id: "month", label: "Month", hint: "Pick a specific uploaded month" },
  { id: "qtd", label: "QTD", hint: "Current calendar quarter" },
  { id: "ytd", label: "YTD", hint: "Current calendar year" },
];

export function PeriodToggle({
  value,
  onChange,
}: {
  value: Period;
  onChange: (p: Period) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border/80 bg-surface/70 p-0.5">
      {PERIODS.map((p) => {
        const active = value === p.id;
        return (
          <button
            key={p.id}
            type="button"
            title={p.hint}
            onClick={() => onChange(p.id)}
            className={cn(
              "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
              active
                ? "bg-white/[0.07] text-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
