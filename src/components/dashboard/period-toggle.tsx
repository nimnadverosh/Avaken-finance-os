"use client";

import { cn } from "@/lib/utils";

export type Period = "MTD" | "QTD" | "YTD" | "12M";

const PERIODS: { id: Period; label: string }[] = [
  { id: "MTD", label: "MTD" },
  { id: "QTD", label: "QTD" },
  { id: "YTD", label: "YTD" },
  { id: "12M", label: "12M" },
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
