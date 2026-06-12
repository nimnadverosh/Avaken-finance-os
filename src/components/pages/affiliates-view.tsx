"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkline } from "@/components/ui/sparkline";
import { Delta } from "@/components/ui/delta";
import { useMemo } from "react";
import { PageHeader } from "./page-header";
import { allAffiliates } from "@/lib/data/queries";
import { useMockDataVersion } from "@/hooks/use-mock-data-version";
import { formatCurrency, formatNumber } from "@/lib/format";

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

export function AffiliatesView() {
  const version = useMockDataVersion();
  const accounts = useMemo(() => allAffiliates(), [version]);
  const totalRevenue = accounts.reduce((a, b) => a + b.revenue, 0);
  const totalOrders = accounts.reduce((a, b) => a + b.orders, 0);
  const totalFollowers = accounts.reduce((a, b) => a + b.followers, 0);
  const avgConversion = accounts.reduce((a, b) => a + b.conversion, 0) / accounts.length;

  return (
    <div>
      <PageHeader
        title="TikTok Shop affiliates"
        description={`${accounts.length} accounts · ${formatCurrency(totalRevenue)} MTD · ${formatNumber(totalFollowers, { compact: true })} followers`}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="MTD revenue" value={formatCurrency(totalRevenue)} accent="#10b981" />
        <Stat label="Orders" value={formatNumber(totalOrders)} accent="#a78bfa" />
        <Stat label="Followers" value={formatNumber(totalFollowers, { compact: true })} accent="#38bdf8" />
        <Stat label="Avg conversion" value={`${avgConversion.toFixed(2)}%`} accent="#f59e0b" />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {accounts.map((a) => {
          const aov = a.orders > 0 ? a.revenue / a.orders : 0;
          const convPct = Math.min(100, (a.conversion / 6) * 100); // visual scale 0–6% → 0–100%
          return (
            <Card key={a.id} className="relative overflow-hidden p-5">
              <div
                className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full opacity-20 blur-3xl"
                style={{ background: a.delta >= 0 ? "#10b981" : "#f43f5e" }}
              />
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold tracking-tight">{a.handle}</p>
                  <p className="text-[11px] text-subtle">{a.niche}</p>
                </div>
                <Badge tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</Badge>
              </div>

              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="tabular text-2xl font-semibold">{formatCurrency(a.revenue)}</p>
                  <Delta value={a.delta} className="mt-1" />
                </div>
                <Sparkline data={a.spark} color={a.delta >= 0 ? "#10b981" : "#f43f5e"} width={110} height={36} />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <Tile label="Followers" value={formatNumber(a.followers, { compact: true })} />
                <Tile label="Orders" value={formatNumber(a.orders)} />
                <Tile label="AOV" value={formatCurrency(aov)} />
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-subtle">Conversion</span>
                  <span className="tabular font-semibold">{a.conversion.toFixed(2)}%</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${convPct}%`,
                      background: `linear-gradient(90deg, #10b981, #34d399)`,
                    }}
                  />
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] text-subtle">
                <span>{a.commission}% commission</span>
                <span>{((a.revenue / totalRevenue) * 100).toFixed(1)}% of total</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <Card className="relative overflow-hidden p-4">
      <div
        className="pointer-events-none absolute -right-6 -top-6 size-20 rounded-full opacity-20 blur-2xl"
        style={{ background: accent }}
      />
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="tabular mt-1 text-lg font-semibold">{value}</p>
    </Card>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/[0.03] py-2 ring-1 ring-white/5">
      <p className="text-[10px] uppercase tracking-wide text-subtle">{label}</p>
      <p className="tabular text-xs font-semibold">{value}</p>
    </div>
  );
}
