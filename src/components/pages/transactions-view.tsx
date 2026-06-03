"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, RotateCcw, Search, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "./page-header";
import { useEntity } from "@/lib/entity-context";
import { clearMockAccountBalances } from "@/lib/data/mock-account-balances";
import { clearMockImports, mockImportCount } from "@/lib/data/mock-ledger";
import { listTransactions } from "@/lib/data/queries";
import { useMockDataVersion } from "@/hooks/use-mock-data-version";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/lib/data/types";

const TYPE_FILTERS: { id: Transaction["type"] | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "payout", label: "Payouts" },
  { id: "income", label: "Income" },
  { id: "expense", label: "Expenses" },
  { id: "transfer", label: "Transfers" },
  { id: "vat", label: "VAT" },
  { id: "tax", label: "Tax" },
];

export function TransactionsView() {
  const router = useRouter();
  const { entity, config } = useEntity();
  const ledgerVersion = useMockDataVersion();
  const [type, setType] = useState<Transaction["type"] | "all">("all");
  const [q, setQ] = useState("");

  const rows = useMemo(
    () => listTransactions(entity, { type: type === "all" ? undefined : type, q }),
    [entity, type, q, ledgerVersion],
  );

  const importedCount = mockImportCount();

  const inflow = rows.filter((r) => r.amount > 0).reduce((a, b) => a + b.amount, 0);
  const outflow = rows.filter((r) => r.amount < 0).reduce((a, b) => a + b.amount, 0);
  const vat = rows.reduce((a, b) => a + b.vat, 0);

  return (
    <div>
      <PageHeader
        title="Transactions"
        description={`${config.label} ledger · ${rows.length} entries · AI-categorised`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {importedCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  clearMockImports();
                  clearMockAccountBalances();
                  router.refresh();
                }}
              >
                <RotateCcw className="size-3.5" />
                Clear mock imports ({importedCount})
              </Button>
            )}
            <Button variant="outline" size="sm">
              <Download className="size-3.5" /> Export CSV
            </Button>
          </div>
        }
      />

      {/* Summary strip */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Inflow" value={formatCurrency(inflow)} accent="#10b981" />
        <Stat label="Outflow" value={formatCurrency(outflow)} accent="#f43f5e" />
        <Stat label="Net" value={formatCurrency(inflow + outflow)} accent="#a78bfa" />
        <Stat label="VAT component" value={formatCurrency(Math.abs(vat))} accent="#f59e0b" />
      </div>

      {/* Filters */}
      <Card className="mb-3 flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-border/80 bg-surface/60 px-3 py-2">
          <Search className="size-3.5 text-subtle" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search description, counterparty, category…"
            className="w-full bg-transparent text-sm placeholder:text-subtle focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setType(f.id)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                type === f.id
                  ? "bg-white/[0.08] text-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Ledger */}
      <Card className="overflow-hidden">
        <div className="hidden grid-cols-[1fr_140px_120px_120px_120px] gap-3 border-b border-border/60 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-subtle md:grid">
          <span>Description</span>
          <span>Date</span>
          <span>Category</span>
          <span className="text-right">VAT</span>
          <span className="text-right">Amount</span>
        </div>
        <div className="divide-y divide-border/60">
          {rows.map((t) => (
            <div
              key={t.id}
              className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-5 py-3 md:grid-cols-[1fr_140px_120px_120px_120px]"
            >
              <span
                className={cn(
                  "size-2 rounded-full md:hidden",
                )}
                style={{ background: t.entity === "personal" ? "#38bdf8" : "#10b981" }}
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className="hidden size-2 rounded-full md:inline-block"
                    style={{ background: t.entity === "personal" ? "#38bdf8" : "#10b981" }}
                  />
                  <p className="truncate text-sm font-medium">{t.description}</p>
                  {t.status === "pending" && (
                    <Badge tone="warning" className="text-[10px]">
                      pending
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-subtle">{t.counterparty}</p>
              </div>
              <span className="hidden text-xs text-muted-foreground md:block">
                {formatDate(t.date)}
              </span>
              <span className="hidden md:block">
                {t.aiCategorised ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet/12 px-1.5 py-0.5 text-[10px] font-medium text-violet ring-1 ring-violet/20">
                    <Sparkles className="size-2.5" />
                    {t.category}
                  </span>
                ) : (
                  <span className="rounded-full bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-muted-foreground ring-1 ring-white/10">
                    {t.category}
                  </span>
                )}
              </span>
              <span className="hidden text-right tabular text-xs text-warning md:block">
                {t.vat !== 0 ? formatCurrency(Math.abs(t.vat)) : "—"}
              </span>
              <span
                className={cn(
                  "text-right tabular text-sm font-semibold",
                  t.amount >= 0 ? "text-positive" : "text-foreground",
                )}
              >
                {t.amount >= 0 ? "+" : ""}
                {formatCurrency(t.amount)}
              </span>
            </div>
          ))}
          {rows.length === 0 && (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              No transactions match the current filter.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <Card className="relative overflow-hidden p-4">
      <div
        className="pointer-events-none absolute -right-6 -top-6 size-20 rounded-full opacity-20 blur-2xl"
        style={{ background: accent }}
      />
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="tabular mt-1 text-lg font-semibold">{value}</p>
    </Card>
  );
}
