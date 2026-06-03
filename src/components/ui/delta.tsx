import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/format";

interface DeltaProps {
  value: number;
  /** When true, a negative number is "good" (e.g. cost reduction). */
  invert?: boolean;
  className?: string;
  showIcon?: boolean;
}

export function Delta({ value, invert = false, className, showIcon = true }: DeltaProps) {
  const positive = invert ? value < 0 : value >= 0;
  const Icon = value >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular",
        positive ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative",
        className,
      )}
    >
      {showIcon && <Icon className="size-3" />}
      {formatPercent(Math.abs(value), { signed: false })}
    </span>
  );
}
