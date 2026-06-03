import { Card } from "@/components/ui/card";
import { Sparkline } from "@/components/ui/sparkline";
import { Delta } from "@/components/ui/delta";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { Kpi } from "@/lib/data/queries";
import { cn } from "@/lib/utils";

function renderValue(kpi: Kpi) {
  if (kpi.format === "currency") return formatCurrency(kpi.value);
  if (kpi.format === "percent") return `${kpi.value.toFixed(1)}%`;
  return formatNumber(kpi.value);
}

export function KpiCard({ kpi, index = 0 }: { kpi: Kpi; index?: number }) {
  const invert = kpi.id === "vat" || kpi.id === "subs";
  return (
    <Card
      className="animate-fade-up overflow-hidden p-5"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-10 size-28 rounded-full opacity-25 blur-2xl"
        style={{ background: kpi.accent }}
      />
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
          <p className="tabular text-2xl font-semibold tracking-tight text-foreground">
            {renderValue(kpi)}
          </p>
        </div>
        <span
          className="size-2 rounded-full"
          style={{ background: kpi.accent, boxShadow: `0 0 12px ${kpi.accent}` }}
        />
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="flex items-center gap-2">
          <Delta value={kpi.delta} invert={invert} />
          <span className={cn("text-[11px] text-subtle")}>{kpi.sub}</span>
        </div>
        <Sparkline data={kpi.spark} color={kpi.accent} />
      </div>
    </Card>
  );
}
