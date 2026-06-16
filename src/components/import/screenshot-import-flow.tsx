"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, RotateCcw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HermesLoadingState } from "./hermes-loading-state";
import { ScreenshotUploadZone } from "./screenshot-upload-zone";
import { ScreenshotPreviewTable } from "./screenshot-preview-table";
import { ScreenshotSourcesGrid } from "./screenshot-sources-grid";
import { ImportAllButton } from "./import-all-button";
import { ImportStatusAlert } from "./import-status-alert";
import { applyHermesAccountBalances } from "@/lib/data/account-balances";
import { getLedgerAccounts } from "@/lib/data/mock-account-balances";
import { prependTransactionsToMock } from "@/lib/data/import";
import { refreshDbLedger } from "@/lib/data/db-cache";
import { messageForAnalyzeError, messageForImportError } from "@/lib/screenshots/errors";
import {
  buildScreenshotSources,
  enrichTransactionsWithBanks,
  type ScreenshotSourceView,
} from "@/lib/screenshots/build-sources";
import type {
  HermesAccountBalance,
  HermesAnalyzeResponse,
  HermesEntityHint,
  HermesExtractedTransaction,
  ScreenshotImportResponse,
} from "@/lib/hermes/types";
import { formatCurrency } from "@/lib/format";

type Step = "upload" | "analysing" | "preview" | "done";

export function ScreenshotImportFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [entityHint, setEntityHint] = useState<HermesEntityHint>("auto");
  const [preview, setPreview] = useState<HermesExtractedTransaction[]>([]);
  const [sources, setSources] = useState<ScreenshotSourceView[]>([]);
  const [batchId, setBatchId] = useState<string | undefined>();
  const [accountBalances, setAccountBalances] = useState<HermesAccountBalance[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [demo, setDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [importStorage, setImportStorage] = useState<"database" | "mock" | null>(null);
  const [analysingCount, setAnalysingCount] = useState(0);
  const [lastFiles, setLastFiles] = useState<{ name: string; previewUrl: string }[]>([]);

  const clearError = useCallback(() => setError(null), []);

  const reset = () => {
    lastFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    setStep("upload");
    setPreview([]);
    setSources([]);
    setBatchId(undefined);
    setAccountBalances([]);
    setWarnings([]);
    setDemo(false);
    setError(null);
    setSuccessMsg(null);
    setImportedCount(0);
    setImportStorage(null);
    setAnalysing(false);
    setLastFiles([]);
  };

  const handleUpload = async (files: File[]) => {
    clearError();
    setSuccessMsg(null);
    setAnalysingCount(files.length);
    setAnalysing(true);
    setStep("analysing");

    const fileMeta = files.map((f) => ({
      name: f.name,
      previewUrl: URL.createObjectURL(f),
    }));
    setLastFiles(fileMeta);

    const form = new FormData();
    files.forEach((f) => form.append("images", f));
    form.append("entity", entityHint);

    try {
      const res = await fetch("/api/screenshots/upload", {
        method: "POST",
        body: form,
      });

      let data: Record<string, unknown> = {};
      try {
        data = (await res.json()) as Record<string, unknown>;
      } catch {
        setError("Invalid response from server. Please try again.");
        setStep("upload");
        setAnalysing(false);
        return;
      }

      if (!res.ok || data.success !== true) {
        setError(messageForAnalyzeError(data as { error?: string; code?: string }));
        setStep("upload");
        setAnalysing(false);
        return;
      }

      const result = data as unknown as HermesAnalyzeResponse;
      if (!result.transactions?.length) {
        setError("No transactions were found. Try clearer screenshots or include transaction lists.");
        setStep("upload");
        setAnalysing(false);
        return;
      }

      const builtSources = buildScreenshotSources(
        fileMeta,
        result.transactions,
        result.screenshotSources,
      );
      const enriched = enrichTransactionsWithBanks(result.transactions, builtSources);

      setPreview(enriched);
      setSources(builtSources);
      setBatchId(result.batchId);
      setAccountBalances(result.accountBalances ?? []);
      void applyHermesAccountBalances(result.accountBalances);
      setWarnings(result.warnings ?? []);
      setDemo(Boolean(result.demo));
      setStep("preview");
    } catch {
      setError("Network error — check your connection and try again.");
      setStep("upload");
    } finally {
      setAnalysing(false);
    }
  };

  const handleImportAll = async () => {
    if (preview.length === 0) return;
    setImporting(true);
    clearError();

    try {
      const res = await fetch("/api/screenshots/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions: preview, batchId, accountBalances }),
      });

      let data: Record<string, unknown> = {};
      try {
        data = (await res.json()) as Record<string, unknown>;
      } catch {
        setError("Invalid response from server.");
        return;
      }

      if (!res.ok || data.success !== true) {
        setError(messageForImportError(data as { error?: string }));
        return;
      }

      const result = data as unknown as ScreenshotImportResponse;
      if (result.storage === "database") {
        await refreshDbLedger();
      } else {
        prependTransactionsToMock(result.transactions, batchId);
      }
      void applyHermesAccountBalances(result.accountBalances ?? accountBalances);
      setImportedCount(result.imported);
      setImportStorage(result.storage);
      setSuccessMsg(
        `${result.imported} transaction${result.imported === 1 ? "" : "s"} imported successfully.`,
      );
      setStep("done");
      router.refresh();
    } catch {
      setError("Network error during import — your review data is still here, try again.");
    } finally {
      setImporting(false);
    }
  };

  const bankSummary = useMemo(
    () => [...new Set(sources.map((s) => s.bank))].join(", "),
    [sources],
  );

  const displayWarnings = useMemo(
    () =>
      warnings.filter((w) => {
        const lower = w.toLowerCase();
        if (accountBalances.length === 0) return true;
        return !(
          lower.includes("no balances found") ||
          lower.includes("bank_balance") ||
          lower.includes("credit_balance")
        );
      }),
    [warnings, accountBalances.length],
  );

  return (
    <div className="space-y-6">
      {step === "upload" && (
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-primary">
          <Camera className="size-3.5" />
          Recommended daily import
        </div>
      )}

      {error && (
        <ImportStatusAlert variant="error" message={error} onDismiss={clearError} />
      )}

      {step === "upload" && (
        <ScreenshotUploadZone
          entityHint={entityHint}
          onEntityHintChange={setEntityHint}
          onUpload={handleUpload}
          disabled={analysing}
        />
      )}

      {step === "analysing" && <HermesLoadingState imageCount={analysingCount} />}

      {step === "preview" && (
        <div className="space-y-6 pb-28">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Review all transactions</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {sources.length} screenshot{sources.length === 1 ? "" : "s"}
                {bankSummary ? ` · ${bankSummary}` : ""} · {preview.length} transactions ready
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={reset} disabled={importing}>
              <RotateCcw className="size-3.5" />
              New batch
            </Button>
          </div>

          <ScreenshotSourcesGrid sources={sources} />

          {accountBalances.length > 0 ? (
            <ImportStatusAlert
              variant="success"
              title="Balances detected"
              message={formatBalanceImportSummary(accountBalances)}
            />
          ) : (
            <p className="rounded-xl border border-border/60 bg-card/30 px-4 py-3 text-xs text-muted-foreground">
              No on-screen balances in this batch — you can still import all transactions. Include
              a home-screen or balance summary screenshot next time to sync bank &amp; card totals.
            </p>
          )}

          <ScreenshotPreviewTable
            rows={preview}
            onChange={setPreview}
            screenshotCount={sources.length}
            warnings={displayWarnings}
            demo={demo}
          />
        </div>
      )}

      {step === "preview" && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/80 bg-background/90 px-4 py-4 backdrop-blur-xl lg:left-[248px]">
          <div className="mx-auto max-w-5xl">
            <ImportAllButton
              count={preview.length}
              loading={importing}
              onClick={handleImportAll}
            />
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="space-y-6">
          {successMsg && (
            <ImportStatusAlert variant="success" title="Import complete" message={successMsg} />
          )}
          <div className="rounded-2xl border border-primary/25 bg-card p-8 text-center sm:p-10">
            <p className="text-sm text-muted-foreground">
              {importedCount} transaction{importedCount === 1 ? "" : "s"} saved
              {importStorage === "database" ? " to your database" : " to your ledger"}.
              Screenshots were never stored.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button variant="outline" onClick={reset}>
                Import another batch
              </Button>
              <Button onClick={() => router.push("/transactions")}>View transactions</Button>
              <Button variant="ghost" onClick={() => router.push("/dashboard")}>
                Dashboard
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatBalanceImportSummary(balances: HermesAccountBalance[]): string {
  const ledger = getLedgerAccounts();
  const bankLines = balances
    .filter((b) => b.kind !== "credit")
    .map((b) => {
      const name = ledger.find((a) => a.id === b.accountId)?.name ?? b.accountId;
      return `Bank balances (${name}): ${formatCurrency(b.balance)}`;
    });
  const creditLines = balances
    .filter((b) => b.kind === "credit")
    .map((b) => {
      const name = ledger.find((a) => a.id === b.accountId)?.name ?? b.accountId;
      return `Credit card debt (${name}): ${formatCurrency(Math.abs(b.balance))}`;
    });
  return [...bankLines, ...creditLines].join(" · ");
}
