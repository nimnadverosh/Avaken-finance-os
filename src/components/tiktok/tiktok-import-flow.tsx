"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImportStatusAlert } from "@/components/import/import-status-alert";
import { useToast } from "@/components/ui/toast";
import { TikTokUploadZone } from "./tiktok-upload-zone";
import { TikTokLoadingState } from "./tiktok-loading-state";
import { TikTokSummaryPreview } from "./tiktok-summary-preview";
import { SplitControl } from "./split-control";
import { TikTokUploadHistory } from "./tiktok-upload-history";
import { parseTikTokFile } from "@/lib/tiktok/parse";
import { buildMonthlySummary, normaliseSplit } from "@/lib/tiktok/model";
import { getSplitConfig, saveTikTokUpload, setSplitConfig } from "@/lib/tiktok/store";
import { formatCurrency } from "@/lib/format";
import type { ParsedTikTokReport } from "@/lib/tiktok/types";

type Step = "upload" | "parsing" | "preview" | "done";

export function TikTokImportFlow() {
  const router = useRouter();
  const { toast, node: toastNode } = useToast();

  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [report, setReport] = useState<ParsedTikTokReport | null>(null);
  const [companyFraction, setCompanyFraction] = useState(() => getSplitConfig().company);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedLabel, setSavedLabel] = useState("");

  // Re-model live as the split slider moves — no recompute of the parse needed.
  const split = useMemo(() => normaliseSplit(companyFraction), [companyFraction]);
  const summary = useMemo(
    () => (report ? buildMonthlySummary(report, split) : null),
    [report, split],
  );

  const reset = useCallback(() => {
    setStep("upload");
    setReport(null);
    setFileName("");
    setError(null);
    setSavedLabel("");
    setCompanyFraction(getSplitConfig().company);
  }, []);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setFileName(file.name);
    setStep("parsing");
    try {
      const parsed = await parseTikTokFile(file);
      setReport(parsed);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that file. Please try again.");
      setStep("upload");
    }
  }, []);

  const handleConfirm = useCallback(() => {
    if (!report) return;
    setSaving(true);
    try {
      // Persist the chosen split globally, then store this month's report.
      setSplitConfig(split.company);
      const record = saveTikTokUpload(report, fileName);
      setSavedLabel(record.summary.periodLabel);
      setStep("done");
      toast({
        title: `${record.summary.periodLabel} imported`,
        description: `${formatCurrency(record.summary.grossRevenue, { decimals: 2 })} commission · dashboard updated`,
        variant: "success",
      });
      // Refresh server components that read the ledger.
      router.refresh();
    } finally {
      setSaving(false);
    }
  }, [report, fileName, split.company, toast, router]);

  return (
    <div className="space-y-6">
      {toastNode}

      {error && <ImportStatusAlert variant="error" message={error} onDismiss={() => setError(null)} />}

      {step === "upload" && (
        <>
          <TikTokUploadZone onFile={handleFile} />
          <TikTokUploadHistory />
        </>
      )}

      {step === "parsing" && <TikTokLoadingState fileName={fileName} />}

      {step === "preview" && summary && report && (
        <div className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Review {summary.periodLabel}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {report.creatorName || "Creator"} · {report.lineCount} settlement lines · parsed in your browser
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={reset} disabled={saving}>
              <RotateCcw className="size-3.5" />
              Choose another file
            </Button>
          </div>

          <SplitControl split={split} onChange={setCompanyFraction} disabled={saving} />

          <TikTokSummaryPreview summary={summary} report={report} />

          <div className="sticky bottom-4 z-20 rounded-2xl border border-primary/25 bg-background/90 p-3 backdrop-blur-xl">
            <Button
              size="lg"
              onClick={handleConfirm}
              disabled={saving}
              className="h-12 w-full text-base font-semibold shadow-[0_8px_32px_-8px_rgba(16,185,129,0.55)]"
            >
              <Save className="size-4" />
              {saving ? "Saving…" : `Import ${summary.periodLabel} & update dashboard`}
            </Button>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="space-y-6">
          <ImportStatusAlert
            variant="success"
            title="Dashboard updated"
            message={`${savedLabel} is now reflected across your KPIs, revenue chart, affiliate leaderboard and insights.`}
          />
          <div className="rounded-2xl border border-primary/25 bg-card p-8 text-center sm:p-10">
            <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-primary/15 ring-1 ring-primary/25">
              <CheckCircle2 className="size-7 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              Your numbers were aggregated, split between Avaken Ltd and personal, and smart-adjusted
              to stay realistic. The report is saved to your upload history.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button onClick={() => router.push("/dashboard")}>
                View dashboard <ArrowRight className="size-3.5" />
              </Button>
              <Button variant="outline" onClick={reset}>
                Import another month
              </Button>
              <Button variant="ghost" onClick={() => router.push("/affiliates")}>
                Affiliates
              </Button>
            </div>
          </div>

          <TikTokUploadHistory />
        </div>
      )}
    </div>
  );
}
