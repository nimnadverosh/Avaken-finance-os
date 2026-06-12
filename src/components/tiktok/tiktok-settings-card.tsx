"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Music2, Upload } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMockDataVersion } from "@/hooks/use-mock-data-version";
import { getAffiliateAccounts } from "@/lib/tiktok/accounts";
import { attributionLabel } from "@/lib/tiktok/model";
import { getTikTokUploads } from "@/lib/tiktok/store";
import { formatCurrency } from "@/lib/format";

/** Settings card: TikTok upload summary and link to the uploader. */
export function TikTokSettingsCard() {
  const version = useMockDataVersion();
  const uploads = useMemo(() => getTikTokUploads(), [version]);
  const accounts = useMemo(() => getAffiliateAccounts(), [version]);
  const latest = uploads[0];

  return (
    <Card className="p-5 lg:col-span-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="grid size-7 place-items-center rounded-lg bg-white/[0.04] ring-1 ring-white/10">
            <Music2 className="size-3.5 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-semibold tracking-tight">TikTok earnings uploads</h3>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/import/tiktok">
            <Upload className="size-3.5" /> Upload report
          </Link>
        </Button>
      </div>

      <p className="mt-2 text-[11px] text-subtle">
        {accounts.length} affiliate account{accounts.length === 1 ? "" : "s"} · assign each Excel upload
        to the correct account. Attribution is automatic from the report month.
      </p>

      <div className="mt-4 rounded-2xl border border-border/70 bg-white/[0.015] p-5">
        <p className="text-[11px] font-medium text-muted-foreground">Latest upload</p>
        {latest ? (
          <>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="text-lg font-semibold">{latest.summary.periodLabel}</p>
              <Badge tone="info">
                {accounts.find((a) => a.id === latest.accountId)?.handle ?? "Account"}
              </Badge>
            </div>
            <p className="tabular text-sm text-muted-foreground">
              {formatCurrency(latest.summary.grossRevenue, { decimals: 2 })} · {uploads.length} upload{uploads.length === 1 ? "" : "s"} on record
            </p>
            <p className="mt-3 text-[11px] text-subtle">
              Attributed to {attributionLabel(latest.summary.split)} ·{" "}
              {formatCurrency(
                latest.split.company >= 1
                  ? latest.summary.company.revenue
                  : latest.summary.personal.revenue,
                { decimals: 0 },
              )}
            </p>
          </>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            No reports uploaded yet — add accounts and import your Nov 2025 earnings file.
          </p>
        )}
      </div>
    </Card>
  );
}
