"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Upload, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AffiliateInsightsSection } from "./affiliate-insights-panel";
import {
  TikTokLifetimePreview,
  TikTokSummaryPreview,
} from "@/components/tiktok/tiktok-summary-preview";
import { useMockDataVersion } from "@/hooks/use-mock-data-version";
import { getAffiliateAccountInsightBundles } from "@/lib/tiktok/affiliate-insights";
import { attributionLabel } from "@/lib/tiktok/model";
import { getTikTokUploads } from "@/lib/tiktok/store";
import { cn } from "@/lib/utils";

type Tab = "monthly" | "alltime";

export function AffiliateAccountDetail({
  accountId,
  onClose,
  layout = "inline",
}: {
  accountId: string;
  onClose: () => void;
  layout?: "inline" | "modal";
}) {
  const version = useMockDataVersion();
  const bundle = useMemo(() => getAffiliateAccountInsightBundles(accountId), [accountId, version]);
  const uploads = useMemo(
    () => getTikTokUploads(accountId).sort((a, b) => b.summary.monthKey.localeCompare(a.summary.monthKey)),
    [accountId, version],
  );
  const [tab, setTab] = useState<Tab>("monthly");
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | undefined>();

  useEffect(() => {
    if (uploads[0]) setSelectedMonthKey(uploads[0].summary.monthKey);
  }, [uploads]);

  useEffect(() => {
    if (layout !== "modal") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, layout]);

  useEffect(() => {
    if (layout === "inline") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [accountId, layout]);

  if (!bundle || uploads.length === 0) return null;

  const { handle, niche, allTime, monthly } = bundle;
  const selectedUpload =
    uploads.find((u) => u.summary.monthKey === selectedMonthKey) ?? uploads[0]!;
  const selectedMonthInsights =
    monthly.find((m) => m.monthKey === selectedUpload.summary.monthKey)?.insights ?? [];

  const content = (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{handle}</h2>
            <Badge tone="info">{niche}</Badge>
            <Badge tone="info">
              {uploads.length} month{uploads.length === 1 ? "" : "s"} uploaded
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {tab === "monthly"
              ? `${selectedUpload.report.creatorName || handle} · ${selectedUpload.report.lineCount} settlement lines · uploaded ${selectedUpload.fileName}`
              : `Lifetime view across ${uploads.length} report${uploads.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            {layout === "inline" ? (
              <>
                <ArrowLeft className="size-3.5" /> Back to accounts
              </>
            ) : (
              <X className="size-4" />
            )}
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/import/tiktok">
              <Upload className="size-3.5" /> Upload report
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex justify-center gap-1 rounded-xl border border-border/60 bg-white/[0.02] p-1">
        {(
          [
            ["monthly", "By month"],
            ["alltime", "All time"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "rounded-lg px-4 py-2 text-[12px] font-medium transition-colors",
              tab === id
                ? "bg-white/[0.08] text-foreground ring-1 ring-white/10"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "monthly" && (
        <>
          <div className="flex flex-wrap gap-2">
            {uploads.map((u) => (
              <button
                key={u.summary.monthKey}
                type="button"
                onClick={() => setSelectedMonthKey(u.summary.monthKey)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[11px] font-medium ring-1 transition-colors",
                  selectedUpload.summary.monthKey === u.summary.monthKey
                    ? "bg-primary/15 text-primary ring-primary/30"
                    : "bg-white/[0.03] text-muted-foreground ring-white/10 hover:text-foreground",
                )}
              >
                {u.summary.periodLabel}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold">Review {selectedUpload.summary.periodLabel}</h3>
            <Badge tone={selectedUpload.summary.split.company >= 1 ? "positive" : "info"}>
              100% {attributionLabel(selectedUpload.summary.split)}
            </Badge>
          </div>

          <TikTokSummaryPreview
            summary={selectedUpload.summary}
            report={selectedUpload.report}
          />

          {selectedMonthInsights.length > 0 && (
            <AffiliateInsightsSection insights={selectedMonthInsights} />
          )}
        </>
      )}

      {tab === "alltime" && (
        <>
          <TikTokLifetimePreview uploads={uploads} handle={handle} />
          {allTime.length > 0 && <AffiliateInsightsSection insights={allTime} />}
        </>
      )}
    </div>
  );

  if (layout === "modal") {
    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6">
        <button
          type="button"
          aria-label="Close"
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <div className="relative my-6 w-full max-w-4xl rounded-2xl border border-primary/20 bg-background/95 p-5 shadow-2xl backdrop-blur-xl sm:p-6">
          {content}
        </div>
      </div>
    );
  }

  return <div className="mx-auto w-full max-w-4xl">{content}</div>;
}
