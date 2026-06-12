"use client";

import Link from "next/link";
import { ChevronRight, Upload } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkline } from "@/components/ui/sparkline";
import { Delta } from "@/components/ui/delta";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { PageHeader } from "./page-header";
import { PeriodToggle, type Period } from "@/components/dashboard/period-toggle";
import { MonthPicker } from "@/components/dashboard/month-picker";
import { TikTokAccountManager } from "@/components/tiktok/tiktok-account-manager";
import { AffiliateAccountDetail } from "@/components/affiliates/affiliate-account-detail";
import { AffiliateInsightsSection } from "@/components/affiliates/affiliate-insights-panel";
import { allAffiliates, listUploadedMonths, periodLabel } from "@/lib/data/queries";
import { getAffiliatePortfolioInsights } from "@/lib/tiktok/affiliate-insights";
import { hasTikTokUploads } from "@/lib/tiktok/store";
import { hasAffiliateAccounts } from "@/lib/tiktok/accounts";
import { useMockDataVersion } from "@/hooks/use-mock-data-version";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { TikTokPeriodSelection } from "@/lib/tiktok/period";
import { cn } from "@/lib/utils";

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
  const [period, setPeriod] = useState<Period>("all");
  const [monthKey, setMonthKey] = useState<string | undefined>();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const uploadedMonths = useMemo(() => listUploadedMonths(), [version]);

  const selection: TikTokPeriodSelection = useMemo(
    () => ({ period, monthKey: period === "month" ? monthKey ?? uploadedMonths[0]?.monthKey : undefined }),
    [period, monthKey, uploadedMonths],
  );

  const accounts = useMemo(() => allAffiliates(selection), [version, selection]);
  const portfolioInsights = useMemo(() => getAffiliatePortfolioInsights(), [version]);
  const hasRealData = hasAffiliateAccounts() || hasTikTokUploads();
  const withRevenue = accounts.filter((a) => a.revenue > 0);
  const periodRevenue = withRevenue.reduce((a, b) => a + b.revenue, 0);
  const totalAllTime = withRevenue.reduce((a, b) => a + (b.totalRevenue ?? b.revenue), 0);
  const totalOrders = withRevenue.reduce((a, b) => a + b.orders, 0);
  const totalMonths = withRevenue.reduce((a, b) => a + (b.uploadMonths ?? 0), 0);
  const periodDesc = periodLabel(selection);

  return (
    <div className="space-y-6">
      <PageHeader
        title="TikTok Shop affiliates"
        description={
          selectedAccountId
            ? "Account insights · monthly and all-time breakdown from your uploads"
            : hasRealData
              ? `${accounts.length} account${accounts.length === 1 ? "" : "s"} · ${formatCurrency(periodRevenue)} ${periodDesc.toLowerCase()} · ${formatCurrency(totalAllTime)} all-time`
              : "Add your creator accounts and upload monthly earnings reports"
        }
        actions={
          !selectedAccountId ? (
            <Button asChild variant="outline" size="sm">
              <Link href="/import/tiktok">
                <Upload className="size-3.5" /> Upload report
              </Link>
            </Button>
          ) : undefined
        }
      />

      {!selectedAccountId && hasRealData && (
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-2">
          <PeriodToggle value={period} onChange={setPeriod} />
          {period === "month" && uploadedMonths.length > 0 && (
            <MonthPicker months={uploadedMonths} value={monthKey} onChange={setMonthKey} />
          )}
        </div>
      )}

      {!selectedAccountId && (
        <div className="mx-auto max-w-4xl">
          <TikTokAccountManager compact />
        </div>
      )}

      {!selectedAccountId && withRevenue.length > 0 && (
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label={periodDesc} value={formatCurrency(periodRevenue)} accent="#10b981" />
          <Stat label="All-time revenue" value={formatCurrency(totalAllTime)} accent="#34d399" />
          <Stat label="Orders (period)" value={formatNumber(totalOrders)} accent="#a78bfa" />
          <Stat label="Uploaded months" value={formatNumber(totalMonths)} accent="#f59e0b" />
        </div>
      )}

      {selectedAccountId ? (
        <AffiliateAccountDetail
          accountId={selectedAccountId}
          onClose={() => setSelectedAccountId(null)}
          layout="inline"
        />
      ) : (
        <>
          {hasTikTokUploads() && (
            <div className="mx-auto max-w-4xl">
              <AffiliateInsightsSection insights={portfolioInsights} />
            </div>
          )}

          {accounts.length === 0 ? (
            <Card className="mx-auto max-w-4xl border-dashed p-10 text-center">
              <p className="text-sm text-muted-foreground">
                No affiliate accounts yet. Add your TikTok handles above, then upload monthly earnings
                reports from TikTok Shop → Affiliate → Earnings.
              </p>
              <Button asChild className="mt-4">
                <Link href="/import/tiktok">Upload your first report</Link>
              </Button>
            </Card>
          ) : (
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-3 md:grid-cols-2">
              {accounts.map((a) => {
                const aov = a.orders > 0 ? a.revenue / a.orders : 0;
                const sharePct = periodRevenue > 0 ? (a.revenue / periodRevenue) * 100 : 0;
                const hasData = a.revenue > 0 || (a.totalRevenue ?? 0) > 0;
                return (
                  <Card
                    key={a.id}
                    role={hasData ? "button" : undefined}
                    tabIndex={hasData ? 0 : undefined}
                    onClick={hasData ? () => setSelectedAccountId(a.id) : undefined}
                    onKeyDown={
                      hasData
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSelectedAccountId(a.id);
                            }
                          }
                        : undefined
                    }
                    className={cn(
                      "relative overflow-hidden p-5 transition-colors",
                      hasData &&
                        "cursor-pointer hover:border-primary/30 hover:bg-white/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                    )}
                  >
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

                    {hasData ? (
                      <>
                        <div className="mt-4 flex items-end justify-between">
                          <div>
                            <p className="tabular text-2xl font-semibold">{formatCurrency(a.revenue)}</p>
                            <p className="text-[11px] text-subtle">{periodDesc}</p>
                            {(a.totalRevenue ?? 0) > a.revenue && (
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                {formatCurrency(a.totalRevenue ?? 0)} all-time · {a.uploadMonths ?? 0} mo
                              </p>
                            )}
                            <Delta value={a.delta} className="mt-1" />
                          </div>
                          <Sparkline
                            data={a.spark}
                            color={a.delta >= 0 ? "#10b981" : "#f43f5e"}
                            width={110}
                            height={36}
                          />
                        </div>

                        {a.monthlyBreakdown && a.monthlyBreakdown.length > 0 && (
                          <div className="mt-3 space-y-1 rounded-lg bg-white/[0.02] p-2 ring-1 ring-white/5">
                            {a.monthlyBreakdown.map((m) => (
                              <div
                                key={m.monthKey}
                                className="flex items-center justify-between text-[11px]"
                              >
                                <span className="text-subtle">{m.label}</span>
                                <span className="tabular font-medium">
                                  {formatCurrency(m.revenue)} · {formatNumber(m.orders)} orders
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                          <Tile label="Orders" value={formatNumber(a.orders)} />
                          <Tile label="AOV" value={formatCurrency(aov)} />
                        </div>

                        <div className="mt-3 flex items-center justify-between text-[11px] text-subtle">
                          <span>{a.payTo === "company" ? "Avaken Ltd" : "Personal"} payout</span>
                          <span className="flex items-center gap-0.5 text-primary">
                            View insights <ChevronRight className="size-3" />
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="mt-4 rounded-xl border border-dashed border-border/60 p-4 text-center">
                        <p className="text-[11px] text-subtle">Upload a monthly report for this account</p>
                        <Button asChild variant="outline" size="sm" className="mt-2">
                          <Link href="/import/tiktok" onClick={(e) => e.stopPropagation()}>
                            Upload
                          </Link>
                        </Button>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </>
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
