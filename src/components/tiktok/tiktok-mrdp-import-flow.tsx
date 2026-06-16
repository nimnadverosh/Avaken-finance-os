"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ImportStatusAlert } from "@/components/import/import-status-alert";
import { useToast } from "@/components/ui/toast";
import { useMockDataVersion } from "@/hooks/use-mock-data-version";
import { formatCurrency } from "@/lib/format";
import { MrdpUploadZone } from "./mrdp-upload-zone";
import { MrdpReviewScreen } from "./mrdp-review";
import { TikTokLoadingState } from "./tiktok-loading-state";
import { TikTokAccountManager, TikTokAccountSelect } from "./tiktok-account-manager";
import { defaultMrdpAssignment, parseMrdpFile } from "@/lib/tiktok/parse-mrdp";
import { importMrdpReport } from "@/lib/tiktok/mrdp-import";
import {
  findAccountByCreatorName,
  getAffiliateAccounts,
  normalizeHandle,
} from "@/lib/tiktok/accounts";
import type { MrdpEntityAssignment, MrdpImportResult, ParsedMrdpReport } from "@/lib/tiktok/mrdp-types";

type Step = "upload" | "parsing" | "review" | "done";

export function TikTokMrdpImportFlow() {
  const router = useRouter();
  const { toast, node: toastNode } = useToast();
  const version = useMockDataVersion();
  const accounts = useMemo(() => getAffiliateAccounts(), [version]);

  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [report, setReport] = useState<ParsedMrdpReport | null>(null);
  const [assignment, setAssignment] = useState<MrdpEntityAssignment>(defaultMrdpAssignment());
  const [importResult, setImportResult] = useState<MrdpImportResult | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

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
    setImportResult(null);
    setFileName("");
    setAssignment(defaultMrdpAssignment());
    setError(null);
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
        const parsed = await parseMrdpFile(file);
        setReport(parsed);
        setAssignment(defaultMrdpAssignment());

        const matched = findAccountByCreatorName(parsed.creatorName);
        if (matched && matched.id !== accountId) {
          setError(
            `Report shows creator "${parsed.creatorName}" but you selected ${selectedAccount?.handle ?? "another account"}. Confirm the account below before importing.`,
          );
        }

        setStep("review");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not read that file. Please try again.");
        setStep("upload");
      }
    },
    [accountId, selectedAccount?.handle],
  );

  const handleImport = useCallback(async () => {
    if (!report || !accountId) return;
    setImporting(true);
    setError(null);
    try {
      const result = await importMrdpReport(report, assignment, accountId);
      setImportResult(result);
      setStep("done");
      toast({
        title: `MRDP ${report.year} imported`,
        description: `${formatCurrency(result.totalRevenue, { decimals: 2 })} across ${result.monthsImported} months · dashboard updated`,
        variant: "success",
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not import report.");
    } finally {
      setImporting(false);
    }
  }, [report, assignment, accountId, toast, router]);

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
                  : "Choose the creator account before you upload the MRDP file"
              }
            />
          )}

          <MrdpUploadZone
            onFile={handleFile}
            disabled={uploadDisabled}
            disabledReason={uploadDisabledReason}
          />
        </>
      )}

      {step === "parsing" && <TikTokLoadingState fileName={fileName} />}

      {step === "review" && report && (
        <div className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Review & Import</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {report.creatorName} · MRDP {report.year} ·{" "}
                {formatCurrency(report.totalRevenue, { decimals: 2 })} ·{" "}
                {report.totalTransactions.toLocaleString()} transactions
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={reset} disabled={importing}>
              <RotateCcw className="size-3.5" />
              Choose another file
            </Button>
          </div>

          <TikTokAccountSelect
            value={accountId}
            onChange={setAccountId}
            suggestedHandle={report.creatorName}
            title="Confirm account"
            description="You can change the account here if the report was assigned to the wrong creator"
          />

          <MrdpReviewScreen
            report={report}
            assignment={assignment}
            onAssignmentChange={setAssignment}
          />

          <div className="sticky bottom-4 z-20 rounded-2xl border border-primary/25 bg-background/90 p-3 backdrop-blur-xl">
            <Button
              size="lg"
              onClick={handleImport}
              disabled={importing || !accountId}
              className="h-12 w-full text-base font-semibold shadow-[0_8px_32px_-8px_rgba(16,185,129,0.55)]"
            >
              <Upload className="size-4" />
              {importing
                ? "Importing…"
                : !accountId
                  ? "Select an account to import"
                  : "Import into Finance OS"}
            </Button>
          </div>
        </div>
      )}

      {step === "done" && importResult && report && (
        <div className="space-y-6">
          <ImportStatusAlert
            variant="success"
            title="Import complete"
            message={`MRDP ${report.year} is now in your ledger — ${importResult.monthsImported} monthly records created across your dashboard, affiliates, and tax reserves.`}
          />

          <Card className="overflow-hidden">
            <div className="border-b border-border/60 px-5 py-4 text-center">
              <div className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-primary/15 ring-1 ring-primary/25">
                <CheckCircle2 className="size-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">
                {formatCurrency(importResult.totalRevenue, { decimals: 2 })} imported
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {importResult.totalTransactions.toLocaleString()} transactions ·{" "}
                {importResult.monthsImported} months · tax year {importResult.year}
              </p>
            </div>

            <div className="grid grid-cols-2 divide-x divide-border/60 border-b border-border/60">
              <div className="px-5 py-4 text-center">
                <p className="text-[11px] uppercase tracking-wider text-subtle">Avaken Ltd</p>
                <p className="tabular mt-1 text-lg font-semibold text-primary">
                  {formatCurrency(importResult.companyRevenue, { decimals: 2 })}
                </p>
              </div>
              <div className="px-5 py-4 text-center">
                <p className="text-[11px] uppercase tracking-wider text-subtle">Personal</p>
                <p className="tabular mt-1 text-lg font-semibold text-info">
                  {formatCurrency(importResult.personalRevenue, { decimals: 2 })}
                </p>
              </div>
            </div>

            {/* Tax reserve suggestions */}
            {importResult.totalReserve > 0 && (
              <div className="px-5 py-5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-warning" />
                  <p className="text-sm font-semibold">Suggested tax reserves</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Based on your entity assignment — set these aside to stay ahead of HMRC
                </p>
                <div className="mt-4 space-y-2">
                  {importResult.corpTaxReserve > 0 && (
                    <ReserveRow
                      label="Corporation tax"
                      amount={importResult.corpTaxReserve}
                      accent="#a78bfa"
                    />
                  )}
                  {importResult.vatReserve > 0 && (
                    <ReserveRow
                      label="VAT due"
                      amount={importResult.vatReserve}
                      accent="#f59e0b"
                    />
                  )}
                  {importResult.personalTaxReserve > 0 && (
                    <ReserveRow
                      label="Personal income tax"
                      amount={importResult.personalTaxReserve}
                      accent="#38bdf8"
                    />
                  )}
                  <div className="mt-3 flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2.5 ring-1 ring-white/[0.05]">
                    <span className="text-sm font-medium">Total to set aside</span>
                    <span className="tabular text-sm font-semibold">
                      {formatCurrency(importResult.totalReserve, { decimals: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </Card>

          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => router.push("/dashboard")}>
              View dashboard <ArrowRight className="size-3.5" />
            </Button>
            <Button variant="outline" onClick={() => router.push("/tax-clarity")}>
              Tax reserves
            </Button>
            <Button variant="ghost" onClick={reset}>
              Import another report
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReserveRow({
  label,
  amount,
  accent,
}: {
  label: string;
  amount: number;
  accent: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <div className="size-2 rounded-full" style={{ background: accent }} />
        <span className="text-muted-foreground">{label}</span>
      </div>
      <span className="tabular font-semibold">
        {formatCurrency(amount, { decimals: 2 })}
      </span>
    </div>
  );
}
