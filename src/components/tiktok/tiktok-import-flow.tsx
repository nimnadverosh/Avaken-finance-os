"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImportStatusAlert } from "@/components/import/import-status-alert";
import { useToast } from "@/components/ui/toast";
import { useMockDataVersion } from "@/hooks/use-mock-data-version";
import { TikTokUploadZone } from "./tiktok-upload-zone";
import { TikTokLoadingState } from "./tiktok-loading-state";
import { TikTokSummaryPreview } from "./tiktok-summary-preview";
import { TikTokUploadHistory } from "./tiktok-upload-history";
import { TikTokAccountManager, TikTokAccountSelect } from "./tiktok-account-manager";
import { parseTikTokFile } from "@/lib/tiktok/parse";
import { attributionLabel, buildMonthlySummary } from "@/lib/tiktok/model";
import { saveTikTokUpload } from "@/lib/tiktok/store";
import {
  findAccountByCreatorName,
  getAffiliateAccounts,
  normalizeHandle,
} from "@/lib/tiktok/accounts";
import { formatCurrency } from "@/lib/format";
import type { ParsedTikTokReport } from "@/lib/tiktok/types";

type Step = "upload" | "parsing" | "preview" | "done";

export function TikTokImportFlow() {
  const router = useRouter();
  const { toast, node: toastNode } = useToast();
  const version = useMockDataVersion();
  const accounts = useMemo(() => getAffiliateAccounts(), [version]);

  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [report, setReport] = useState<ParsedTikTokReport | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedLabel, setSavedLabel] = useState("");

  const summary = useMemo(
    () => (report ? buildMonthlySummary(report) : null),
    [report],
  );

  const suggestedPayTo: "personal" | "company" =
    summary && summary.split.company >= 1 ? "company" : "personal";

  const selectedAccount = accountId ? accounts.find((a) => a.id === accountId) : null;

  useEffect(() => {
    if (accounts.length === 1) {
      setAccountId(accounts[0]!.id);
      return;
    }
    if (accountId && !accounts.some((a) => a.id === accountId)) {
      setAccountId(null);
    }
  }, [accounts, accountId]);

  const reset = useCallback(() => {
    setStep("upload");
    setReport(null);
    setFileName("");
    setError(null);
    setSavedLabel("");
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      if (!accountId) {
        setError("Select an affiliate account before uploading.");
        return;
      }

      setError(null);
      setFileName(file.name);
      setStep("parsing");
      try {
        const parsed = await parseTikTokFile(file);
        setReport(parsed);

        const matched = findAccountByCreatorName(parsed.creatorName);
        if (matched && matched.id !== accountId) {
          setError(
            `File shows creator ${normalizeHandle(parsed.creatorName)} but you selected ${selectedAccount?.handle ?? "another account"}. Confirm the account below before importing.`,
          );
        }

        setStep("preview");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not read that file. Please try again.");
        setStep("upload");
      }
    },
    [accountId, selectedAccount?.handle],
  );

  const handleConfirm = useCallback(async () => {
    if (!report || !accountId) return;
    setSaving(true);
    try {
      const record = await saveTikTokUpload(report, fileName, accountId);
      const account = getAffiliateAccounts().find((a) => a.id === accountId);
      setSavedLabel(record.summary.periodLabel);
      setStep("done");
      toast({
        title: `${record.summary.periodLabel} imported`,
        description: `${formatCurrency(record.summary.grossRevenue, { decimals: 2 })} → ${account?.handle ?? "account"} · dashboard updated`,
        variant: "success",
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save upload.");
      setStep("preview");
    } finally {
      setSaving(false);
    }
  }, [report, fileName, accountId, toast, router]);

  const uploadDisabled = accounts.length === 0 || !accountId;
  const uploadDisabledReason =
    accounts.length === 0
      ? "Add an affiliate account above before uploading"
      : !accountId
        ? "Select which account this report is for, then drop your file"
        : undefined;

  return (
    <div className="space-y-6">
      {toastNode}

      {error && <ImportStatusAlert variant="error" message={error} onDismiss={() => setError(null)} />}

      {step === "upload" && (
        <>
          <TikTokAccountManager compact />

          {accounts.length > 0 && (
            <TikTokAccountSelect
              value={accountId}
              onChange={setAccountId}
              title="Upload for account"
              description={
                selectedAccount
                  ? `${selectedAccount.handle} · ${selectedAccount.niche} · this report will be linked here`
                  : "Choose the creator account before you upload the Excel file"
              }
            />
          )}

          <TikTokUploadZone
            onFile={handleFile}
            disabled={uploadDisabled}
            disabledReason={uploadDisabledReason}
          />
          <TikTokUploadHistory />
        </>
      )}

      {step === "parsing" && <TikTokLoadingState fileName={fileName} />}

      {step === "preview" && summary && report && (
        <div className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">Review {summary.periodLabel}</h2>
                <Badge tone={summary.split.company >= 1 ? "positive" : "info"}>
                  100% {attributionLabel(summary.split)}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {report.creatorName || "Creator"} · {report.lineCount} settlement lines ·{" "}
                {summary.split.company >= 1
                  ? "Jul 2026+ reports go to Avaken Ltd"
                  : "Pre–Jul 2026 reports go to Personal"}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={reset} disabled={saving}>
              <RotateCcw className="size-3.5" />
              Choose another file
            </Button>
          </div>

          <TikTokAccountSelect
            value={accountId}
            onChange={setAccountId}
            suggestedHandle={report.creatorName}
            suggestedPayTo={suggestedPayTo}
            title="Confirm account"
            description="You can change the account here if the file was assigned to the wrong creator"
          />

          <TikTokSummaryPreview summary={summary} report={report} />

          <div className="sticky bottom-4 z-20 rounded-2xl border border-primary/25 bg-background/90 p-3 backdrop-blur-xl">
            <Button
              size="lg"
              onClick={handleConfirm}
              disabled={saving || !accountId}
              className="h-12 w-full text-base font-semibold shadow-[0_8px_32px_-8px_rgba(16,185,129,0.55)]"
            >
              <Save className="size-4" />
              {saving
                ? "Saving…"
                : !accountId
                  ? "Select an account to import"
                  : `Import ${summary.periodLabel} & update dashboard`}
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
              Commission was attributed automatically from the report month (100% Avaken Ltd from Jul
              2026, 100% Personal before). Figures are smart-adjusted and saved to your upload history.
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
