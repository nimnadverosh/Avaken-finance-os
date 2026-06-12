import { Card } from "@/components/ui/card";
import { Sparkline } from "@/components/ui/sparkline";
import { Delta } from "@/components/ui/delta";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { TikTokAccount } from "@/lib/data/types";

const STATUS_TONE = {
  scaling: "positive",
  stable: "info",
  warming: "warning",
  "at-risk": "negative",
} as const;

const STATUS_LABEL = {
  scaling: "Scaling",
  stable: "Stable",
  warming: "Warming",
  "at-risk": "At risk",
} as const;

export function AffiliatesLeaderboard({
  accounts,
  periodLabel: periodLabelText = "All uploads",
}: {
  accounts: TikTokAccount[];
  periodLabel?: string;
}) {
  const total = accounts.reduce((a, b) => a + b.revenue, 0);
  const allTime = accounts.reduce((a, b) => a + (b.totalRevenue ?? b.revenue), 0);
  const withData = accounts.filter((a) => a.revenue > 0 || (a.totalRevenue ?? 0) > 0);

  if (withData.length === 0) {
    return (
      <Card className="overflow-hidden p-5 text-center">
        <h3 className="text-sm font-semibold tracking-tight">TikTok Shop affiliates</h3>
        <p className="mt-2 text-[11px] text-subtle">
          Add affiliate accounts and upload monthly earnings reports to see real numbers here.
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">TikTok Shop · Top performers</h3>
          <p className="text-[11px] text-subtle">
            {withData.length} accounts · {formatCurrency(total)} {periodLabelText.toLowerCase()}
            {allTime > total ? ` · ${formatCurrency(allTime)} all-time` : ""}
          </p>
        </div>
        <span className="text-[11px] text-subtle">monthly trend</span>
      </div>
      <div className="divide-y divide-border/60">
        {withData.map((a) => (
          <div key={a.id} className="grid grid-cols-[1fr_auto] gap-3 px-5 py-3.5 sm:grid-cols-[1.6fr_1fr_auto] sm:items-center">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium">{a.handle}</p>
                <Badge tone={STATUS_TONE[a.status]} className="hidden sm:inline-flex">
                  {STATUS_LABEL[a.status]}
                </Badge>
              </div>
              <p className="truncate text-[11px] text-subtle">
                {a.niche} · {formatNumber(a.followers, { compact: true })} followers · {a.orders} orders
              </p>
            </div>
            <div className="hidden sm:flex items-center justify-end">
              <Sparkline data={a.spark} color={a.delta >= 0 ? "#10b981" : "#f43f5e"} />
            </div>
            <div className="text-right">
              <p className="tabular text-sm font-semibold">{formatCurrency(a.revenue)}</p>
              <Delta value={a.delta} className="mt-0.5" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
