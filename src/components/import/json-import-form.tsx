"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, FileJson, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { applyHermesAccountBalances } from "@/lib/data/account-balances";
import { prependTransactionsToMock } from "@/lib/data/import";
import { refreshDbLedger } from "@/lib/data/db-cache";
import { ENTITIES } from "@/lib/entity-context";
import type { JsonImportResponse } from "@/lib/hermes/types";
import { cn } from "@/lib/utils";

const SAMPLE = `{
  "success": true,
  "batchId": "starling-batch-001",
  "detected_entity": "personal",
  "balances": [
    { "institution": "Starling", "account_type": "current", "balance": 8734.56 },
    { "institution": "RBS", "account_type": "current", "balance": 4380.92 },
    { "institution": "RBS", "account_type": "credit_card", "balance": 1562.3 },
    { "institution": "Barclays", "account_type": "savings", "balance": 22600 },
    { "institution": "Barclays", "account_type": "credit_card", "balance": 920 },
    { "institution": "Amex", "account_type": "credit_card", "balance": 2840.5 }
  ],
  "confidence": 0.92,
  "transactions": [
    {
      "id": "preview-1",
      "date": "2026-06-01",
      "description": "TESCO STORES",
      "counterparty": "Tesco",
      "amount": -34.2,
      "category": "Groceries",
      "type": "expense",
      "entity": "personal"
    }
  ],
  "warnings": [],
  "processedAt": "2026-06-03T12:00:00.000Z"
}`;

const ENTITY_OPTIONS = ENTITIES.filter((e) => e.id !== "consolidated").map((e) => ({
  id: e.id as "personal" | "avaken",
  label: e.label,
  accent: e.accent,
  sub:
    e.id === "personal"
      ? "Starling, RBS, Barclays, Apple Pay, eToro…"
      : "Tide business account only",
}));

export function JsonImportForm() {
  const router = useRouter();
  const [jsonText, setJsonText] = useState("");
  const [importEntity, setImportEntity] = useState<"personal" | "avaken">("personal");
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  const handleSubmit = async () => {
    clearMessages();
    let payload: unknown;
    try {
      payload = JSON.parse(jsonText.trim() || "{}");
    } catch {
      setError("Invalid JSON — check brackets and quotes.");
      return;
    }

    setImporting(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (apiKey.trim()) {
        headers.Authorization = `Bearer ${apiKey.trim()}`;
      }

      const res = await fetch("/api/import/json", {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...(typeof payload === "object" && payload !== null ? payload : { data: payload }),
          importEntityHint: importEntity,
        }),
      });

      let data: Record<string, unknown> = {};
      try {
        data = (await res.json()) as Record<string, unknown>;
      } catch {
        setError("Invalid response from server.");
        return;
      }

      if (!res.ok || data.success !== true) {
        setError(typeof data.error === "string" ? data.error : "Import failed");
        return;
      }

      const result = data as unknown as JsonImportResponse;
      if (result.storage === "database") {
        await refreshDbLedger();
      } else if (result.transactions?.length) {
        prependTransactionsToMock(result.transactions, result.batchId, "hermes.json.import");
      }
      applyHermesAccountBalances(result.accountBalances);
      setSuccess(result.message);
      router.refresh();
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="rounded-xl border border-border/60 bg-card/40 p-4 text-sm text-muted-foreground space-y-2">
        <p className="flex items-center gap-2 font-medium text-foreground">
          <FileJson className="h-4 w-4" />
          Hermes JSON import
        </p>
        <p>
          Paste the same JSON Hermes returns after analysis. Hermes <code className="text-xs bg-muted px-1 py-0.5 rounded">detected_entity</code> is
          used when present; otherwise bank names (Starling → Personal, Tide → Avaken) and your selection below apply.
        </p>
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium">Entity</span>
        <p className="text-xs text-muted-foreground">
          Default for this import when JSON has no <code className="bg-muted px-1 rounded">detected_entity</code> or bank hint.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {ENTITY_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                clearMessages();
                setImportEntity(opt.id);
              }}
              className={cn(
                "rounded-xl border p-3 text-left transition-all",
                importEntity === opt.id
                  ? "border-primary/40 bg-primary/[0.06] shadow-[0_0_0_1px_rgba(16,185,129,0.25)]"
                  : "border-border/80 bg-card/60 hover:border-border-strong hover:bg-white/[0.02]",
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className="size-2 rounded-full"
                  style={{
                    background: opt.accent,
                    boxShadow: importEntity === opt.id ? `0 0 8px ${opt.accent}` : undefined,
                  }}
                />
                <span className="text-sm font-medium">{opt.label}</span>
              </div>
              <p className="mt-1 pl-4 text-[11px] text-muted-foreground">{opt.sub}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="json-payload" className="text-sm font-medium">
          JSON payload
        </label>
        <textarea
          id="json-payload"
          value={jsonText}
          onChange={(e) => {
            clearMessages();
            setJsonText(e.target.value);
          }}
          placeholder={SAMPLE}
          rows={16}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring"
          spellCheck={false}
        />
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setJsonText(SAMPLE)}>
            Load sample
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setJsonText("")}>
            Clear
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="import-api-key" className="text-sm font-medium">
          API key <span className="text-muted-foreground font-normal">(required when configured on server)</span>
        </label>
        <input
          id="import-api-key"
          type="password"
          autoComplete="off"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Same as IMPORT_JSON_API_KEY on the server"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2" role="status">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {success}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleSubmit} disabled={importing || !jsonText.trim()}>
          {importing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Importing…
            </>
          ) : (
            "Import JSON"
          )}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/transactions">
            <ArrowLeft className="h-4 w-4" />
            View transactions
          </Link>
        </Button>
      </div>
    </div>
  );
}
