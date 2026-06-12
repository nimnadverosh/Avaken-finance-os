"use client";

import Link from "next/link";
import { Upload } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkline } from "@/components/ui/sparkline";
import { Delta } from "@/components/ui/delta";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";
import { PageHeader } from "./page-header";
import { TikTokAccountManager } from "@/components/tiktok/tiktok-account-manager";
import { allAffiliates } from "@/lib/data/queries";
import { hasTikTokUploads } from "@/lib/tiktok/store";
import { hasAffiliateAccounts } from "@/lib/tiktok/accounts";
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
  const hasRealData = hasAffiliateAccounts() || hasTikTokUploads();
  const withRevenue = accounts.filter((a) => a.revenue > 0);
  const totalRevenue = withRevenue.reduce((a, b) => a + b.revenue, 0);
  const totalOrders = withRevenue.reduce((a, b) => a + b.orders, 0);
  const avgConversion =
    withRevenue.length > 0
      ? withRevenue.reduce((a, b) => a + b.conversion, 0) / withRevenue.length
      : 0;

  return (
    <div>
      <PageHeader
        title="TikTok Shop affiliates"
        description={
          hasRealData
            ? `${accounts.length} account${accounts.length === 1 ? "" : "s"} · ${formatCurrency(totalRevenue)} latest month`
            : "Add your creator accounts and upload monthly earnings reports"
        }
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/import/tiktok">
              <Upload className="size-3.5" /> Upload report
            </Link>
          </Button>
        }
      />

      <div className="mb-6">
        <TikTokAccountManager compact />
      </div>

      {withRevenue.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Stat label="Latest month revenue" value={formatCurrency(totalRevenue)} accent="#10b981" />
          <Stat label="Orders" value={formatNumber(totalOrders)} accent="#a78bfa" />
          <Stat label="Avg conversion" value={`${avgConversion.toFixed(2)}%`} accent="#f59e0b" />
        </div>
      )}

      {accounts.length === 0 ? (
        <Card className="border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No affiliate accounts yet. Add your TikTok handles above, then upload your Nov 2025 earnings
            report (and other months) from TikTok Shop → Affiliate → Earnings.
          </p>
          <Button asChild className="mt-4">
            <Link href="/import/tiktok">Upload your first report</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {accounts.map((a) => {
            const aov = a.orders > 0 ? a.revenue / a.orders : 0;
            const convPct = Math.min(100, (a.conversion / 6) * 100);
            const sharePct = totalRevenue > 0 ? (a.revenue / totalRevenue) * 100 : 0;
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
                  {a.revenue > 0 ? (
                    <Badge tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</Badge>
                  ) : (
                    <Badge tone="info">No upload</Badge>
                  )}
                </div>

                {a.revenue > 0 ? (
                  <>
                    <div className="mt-4 flex items-end justify-between">
                      <div>
                        <p className="tabular text-2xl font-semibold">{formatCurrency(a.revenue)}</p>
                        <Delta value={a.delta} className="mt-1" />
                      </div>
                      <Sparkline
                        data={a.spark}
                        color={a.delta >= 0 ? "#10b981" : "#f43f5e"}
                        width={110}
                        height={36}
                      />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                      <Tile label="Orders" value={formatNumber(a.orders)} />
                      <Tile label="AOV" value={formatCurrency(aov)} />
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[11px] text-subtle">
                      <span>{a.payTo === "company" ? "Avaken Ltd" : "Personal"} payout</span>
                      <span>{sharePct.toFixed(1)}% of total</span>
                    </div>
                  </>
                ) : (
                  <div className="mt-4 rounded-xl border border-dashed border-border/60 p-4 text-center">
                    <p className="text-[11px] text-subtle">Upload a monthly report for this account</p>
                    <Button asChild variant="outline" size="sm" className="mt-2">
                      <Link href="/import/tiktok">Upload</Link>
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
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
