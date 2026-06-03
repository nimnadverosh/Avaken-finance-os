"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, RotateCcw, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HermesLoadingState } from "./hermes-loading-state";
import { ScreenshotUploadZone } from "./screenshot-upload-zone";
import { ScreenshotPreviewTable } from "./screenshot-preview-table";
import { applyHermesAccountBalances } from "@/lib/data/account-balances";
import { getLedgerAccounts } from "@/lib/data/mock-account-balances";
import { prependTransactionsToMock } from "@/lib/data/import";
import { messageForAnalyzeError, messageForImportError } from "@/lib/screenshots/errors";
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
  const [batchId, setBatchId] = useState<string | undefined>();
  const [accountBalances, setAccountBalances] = useState<HermesAccountBalance[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [demo, setDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [importStorage, setImportStorage] = useState<"database" | "mock" | null>(null);
  const [analysingCount, setAnalysingCount] = useState(0);

  const clearError = useCallback(() => setError(null), []);

  const reset = () => {
    setStep("upload");
    setPreview([]);
    setBatchId(undefined);
    setAccountBalances([]);
    setWarnings([]);
    setDemo(false);
    setError(null);
    setImportedCount(0);
    setImportStorage(null);
    setAnalysing(false);
  };

  const handleUpload = async (files: File[]) => {
    clearError();
    setAnalysingCount(files.length);
    setAnalysing(true);
    setStep("analysing");

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
        setError("No transactions were found in your screenshots.");
        setStep("upload");
        setAnalysing(false);
        return;
      }

      setPreview(result.transactions);
      setBatchId(result.batchId);
      setAccountBalances(result.accountBalances ?? []);
      applyHermesAccountBalances(result.accountBalances);
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
      prependTransactionsToMock(result.transactions, batchId);
      applyHermesAccountBalances(result.accountBalances ?? accountBalances);
      setImportedCount(result.imported);
      setImportStorage(result.storage);
      setStep("done");
      router.refresh();
    } catch {
      setError("Network error during import — your review data is still here, try again.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {step !== "done" && (
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to dashboard
        </Link>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-xl border border-negative/30 bg-negative/[0.06] px-4 py-3 text-sm text-negative"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={clearError}
            className="shrink-0 rounded p-0.5 hover:bg-negative/10"
            aria-label="Dismiss error"
          >
            <X className="size-4" />
          </button>
        </div>
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
        <div className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Review extracted transactions</h2>
              <p className="text-sm text-muted-foreground">
                Edit any field, remove rows, then import to your ledger.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={reset} disabled={importing}>
                <RotateCcw className="size-3.5" />
                Upload more
              </Button>
              <Button
                size="sm"
                onClick={handleImportAll}
                disabled={importing || preview.length === 0}
              >
                {importing ? "Importing…" : `Import all (${preview.length})`}
              </Button>
            </div>
          </div>
          {accountBalances.length > 0 ? (
            <div className="rounded-xl border border-border/60 bg-card/40 px-4 py-3 text-sm space-y-1.5">
              <p className="font-medium text-foreground">Balances detected — will update Personal dashboard</p>
              <p className="text-emerald-600 dark:text-emerald-400">
                Bank:{" "}
                {accountBalances
                  .filter((b) => b.kind !== "credit")
                  .map((b) => {
                    const name =
                      getLedgerAccounts().find((a) => a.id === b.accountId)?.name ?? b.accountId;
                    return `${name} ${formatCurrency(b.balance)}`;
                  })
                  .join(" · ") || "—"}
              </p>
              <p className="text-negative">
                Cards:{" "}
                {accountBalances
                  .filter((b) => b.kind === "credit")
                  .map((b) => {
                    const name =
                      getLedgerAccounts().find((a) => a.id === b.accountId)?.name ?? b.accountId;
                    return `${name} ${formatCurrency(Math.abs(b.balance))}`;
                  })
                  .join(" · ") || "—"}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200/90">
              No balances found in the Hermes response. Include{" "}
              <code className="text-xs">bank_balance</code> / <code className="text-xs">credit_balance</code>{" "}
              or a <code className="text-xs">balances</code> array with account types.
            </div>
          )}
          <ScreenshotPreviewTable
            rows={preview}
            onChange={setPreview}
            warnings={warnings}
            demo={demo}
          />
          <div className="flex justify-end">
            <Button onClick={handleImportAll} disabled={importing || preview.length === 0}>
              {importing ? "Importing…" : `Import all (${preview.length})`}
            </Button>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="rounded-2xl border border-primary/25 bg-card p-10 text-center">
          <CheckCircle2 className="mx-auto size-12 text-primary" />
          <h2 className="mt-4 text-xl font-semibold">Import complete</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {importedCount} transaction{importedCount === 1 ? "" : "s"} saved
            {importStorage === "database" ? " to your database" : " to your ledger"}.
            Screenshots were never stored on Avaken.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button variant="outline" onClick={reset}>
              Import more screenshots
            </Button>
            <Button onClick={() => router.push("/transactions")}>View transactions</Button>
          </div>
        </div>
      )}
    </div>
  );
}
