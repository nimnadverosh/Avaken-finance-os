"use client";

import { useMemo } from "react";
import { History, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { useMockDataVersion } from "@/hooks/use-mock-data-version";
import { attributionLabel } from "@/lib/tiktok/model";
import { affiliateLabelForUpload } from "@/lib/tiktok/dashboard";
import { deleteTikTokUpload, getTikTokUploads } from "@/lib/tiktok/store";

/** Historical list of every stored monthly upload, with per-row delete. */
export function TikTokUploadHistory() {
  const version = useMockDataVersion();
  const uploads = useMemo(() => getTikTokUploads(), [version]);

  if (uploads.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
        <div className="flex items-center gap-2">
          <History className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold tracking-tight">Upload history</h3>
        </div>
        <span className="text-[11px] text-subtle">{uploads.length} month{uploads.length === 1 ? "" : "s"} on record</span>
      </div>

      <div className="divide-y divide-border/60">
        {uploads.map((u) => (
          <div key={u.id} className="flex items-center justify-between gap-3 px-5 py-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">{u.summary.periodLabel}</p>
                <Badge tone="info">{affiliateLabelForUpload(u)}</Badge>
                <Badge tone={u.split.company >= 1 ? "positive" : "info"}>
                  {attributionLabel(u.split)}
                </Badge>
              </div>
              <p className="truncate text-[11px] text-subtle">
                {u.fileName} · uploaded {formatDate(u.uploadedAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="tabular text-sm font-semibold">{formatCurrency(u.summary.grossRevenue, { decimals: 2 })}</p>
                <p className="text-[11px] text-subtle">{formatNumber(u.summary.orderCount)} orders</p>
              </div>
              <button
                type="button"
                onClick={() => void deleteTikTokUpload(u.id)}
                aria-label={`Delete ${u.summary.periodLabel} upload`}
                className="rounded-md p-1.5 text-subtle transition-colors hover:bg-negative/10 hover:text-negative"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
