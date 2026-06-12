"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Music2, Upload } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMockDataVersion } from "@/hooks/use-mock-data-version";
import { getTikTokUploads } from "@/lib/tiktok/store";
import { attributionLabel } from "@/lib/tiktok/model";
import { formatCurrency } from "@/lib/format";

/** Settings card: TikTok upload summary and link to the uploader. */
export function TikTokSettingsCard() {
  const version = useMockDataVersion();
  const uploads = useMemo(() => getTikTokUploads(), [version]);
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
        Attribution is automatic from the report month: <strong className="text-foreground">100% Avaken Ltd</strong> from
        Jul 2026 onwards, <strong className="text-foreground">100% Personal</strong> before that.
      </p>

      <div className="mt-4 rounded-2xl border border-border/70 bg-white/[0.015] p-5">
        <p className="text-[11px] font-medium text-muted-foreground">Latest upload</p>
        {latest ? (
          <>
            <p className="mt-1 text-lg font-semibold">{latest.summary.periodLabel}</p>
            <p className="tabular text-sm text-muted-foreground">
              {formatCurrency(latest.summary.grossRevenue, { decimals: 2 })} · {uploads.length} on record
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
          <p className="mt-1 text-sm text-muted-foreground">No reports uploaded yet.</p>
        )}
      </div>
    </Card>
  );
}
