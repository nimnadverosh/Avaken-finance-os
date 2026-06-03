import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type { Reserve } from "@/lib/data/queries";
import { cn } from "@/lib/utils";

interface ReserveGaugeProps {
  reserve: Reserve;
  index?: number;
}

export function ReserveGauge({ reserve, index = 0 }: ReserveGaugeProps) {
  const pct = Math.max(0, Math.min(1.5, reserve.coverage));
  const overFunded = pct >= 1;
  const underFunded = pct < 0.9;

  // Half-doughnut arc (180°)
  const R = 64;
  const C = 2 * Math.PI * R;
  const halfC = C / 2;
  const dash = (Math.min(pct, 1) * halfC).toFixed(2);

  return (
    <Card
      className="animate-fade-up overflow-hidden p-5"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div
        className="pointer-events-none absolute -left-8 -top-12 size-32 rounded-full opacity-20 blur-3xl"
        style={{ background: reserve.accent }}
      />

      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{reserve.label}</p>
          <p className="mt-1 tabular text-2xl font-semibold tracking-tight">
            {formatCurrency(reserve.reserved)}
          </p>
          <p className="mt-0.5 text-[11px] text-subtle">{reserve.accountName}</p>
        </div>

        <div className="relative h-[78px] w-[140px] shrink-0">
          <svg viewBox="0 0 160 90" className="absolute inset-0 h-full w-full overflow-visible">
            <defs>
              <linearGradient id={`g-${reserve.label.replace(/\s/g, "")}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={reserve.accent} stopOpacity="0.4" />
                <stop offset="100%" stopColor={reserve.accent} stopOpacity="1" />
              </linearGradient>
            </defs>
            <path
              d={`M 16 80 A ${R} ${R} 0 0 1 144 80`}
              fill="none"
              stroke="#1b1f2a"
              strokeWidth="10"
              strokeLinecap="round"
            />
            <path
              d={`M 16 80 A ${R} ${R} 0 0 1 144 80`}
              fill="none"
              stroke={`url(#g-${reserve.label.replace(/\s/g, "")})`}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${halfC}`}
              pathLength={halfC}
            />
          </svg>
          <div className="absolute inset-x-0 bottom-1 flex flex-col items-center">
            <span
              className={cn(
                "tabular text-base font-semibold",
                overFunded ? "text-positive" : underFunded ? "text-negative" : "text-warning",
              )}
            >
              {Math.round(pct * 100)}%
            </span>
            <span className="text-[10px] uppercase tracking-wide text-subtle">coverage</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
        <span>Est. liability {formatCurrency(reserve.estimated)}</span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 font-medium",
            overFunded
              ? "bg-positive/12 text-positive ring-1 ring-positive/20"
              : underFunded
                ? "bg-negative/12 text-negative ring-1 ring-negative/20"
                : "bg-warning/12 text-warning ring-1 ring-warning/20",
          )}
        >
          {overFunded ? "Funded" : underFunded ? "Under-funded" : "On track"}
        </span>
      </div>
      <p className="mt-2 text-[11px] leading-snug text-subtle">{reserve.hint}</p>
    </Card>
  );
}
