"use client";

import { cn } from "@/lib/utils";
import type { UploadedMonthOption } from "@/lib/tiktok/period";

export function MonthPicker({
  months,
  value,
  onChange,
  className,
}: {
  months: UploadedMonthOption[];
  value: string | undefined;
  onChange: (monthKey: string) => void;
  className?: string;
}) {
  if (months.length === 0) return null;

  return (
    <select
      value={value ?? months[0]!.monthKey}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-9 min-w-[160px] rounded-lg border border-border/80 bg-surface/70 px-2.5 text-[11px] font-medium outline-none focus:border-primary/40",
        className,
      )}
    >
      {months.map((m) => (
        <option key={m.monthKey} value={m.monthKey}>
          {m.label}
        </option>
      ))}
    </select>
  );
}
