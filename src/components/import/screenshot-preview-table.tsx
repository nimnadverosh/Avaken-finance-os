"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ENTITIES } from "@/lib/entity-context";
import { formatCurrency } from "@/lib/format";
import type { HermesExtractedTransaction } from "@/lib/hermes/types";
import type { TxnType } from "@/lib/data/types";
import { cn } from "@/lib/utils";

const TXN_TYPES: TxnType[] = ["income", "expense", "payout", "transfer", "vat", "tax"];

interface ScreenshotPreviewTableProps {
  rows: HermesExtractedTransaction[];
  onChange: (rows: HermesExtractedTransaction[]) => void;
  warnings?: string[];
  demo?: boolean;
}

export function ScreenshotPreviewTable({
  rows,
  onChange,
  warnings = [],
  demo,
}: ScreenshotPreviewTableProps) {
  const update = (id: string, patch: Partial<HermesExtractedTransaction>) => {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const remove = (id: string) => {
    onChange(rows.filter((r) => r.id !== id));
  };

  const inflow = rows.filter((r) => r.amount > 0).reduce((a, b) => a + b.amount, 0);
  const outflow = rows.filter((r) => r.amount < 0).reduce((a, b) => a + b.amount, 0);

  return (
    <div className="space-y-4">
      {(warnings.length > 0 || demo) && (
        <div className="rounded-xl border border-warning/30 bg-warning/[0.06] px-4 py-3 text-xs text-muted-foreground">
          {warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <MiniStat label="Rows" value={String(rows.length)} />
        <MiniStat label="Inflow" value={formatCurrency(inflow)} accent="#10b981" />
        <MiniStat label="Outflow" value={formatCurrency(outflow)} accent="#f43f5e" />
      </div>

      <Card className="overflow-hidden">
        <div className="hidden gap-2 border-b border-border/60 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-subtle lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_100px_90px_100px_90px_36px]">
          <span>Description</span>
          <span>Counterparty</span>
          <span>Date</span>
          <span>Entity</span>
          <span>Type</span>
          <span className="text-right">Amount</span>
          <span />
        </div>
        <div className="divide-y divide-border/60">
          {rows.map((row) => {
            const entityCfg = ENTITIES.find((e) => e.id === row.entity);
            return (
              <div
                key={row.id}
                className="grid gap-2 px-4 py-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_100px_90px_100px_90px_36px] lg:items-center"
              >
                <input
                  value={row.description}
                  onChange={(e) => update(row.id, { description: e.target.value })}
                  className="w-full rounded-md border border-border/60 bg-surface/50 px-2 py-1.5 text-sm focus:border-primary/40 focus:outline-none"
                />
                <input
                  value={row.counterparty}
                  onChange={(e) => update(row.id, { counterparty: e.target.value })}
                  className="w-full rounded-md border border-border/60 bg-surface/50 px-2 py-1.5 text-sm focus:border-primary/40 focus:outline-none"
                />
                <input
                  type="date"
                  value={row.date}
                  onChange={(e) => update(row.id, { date: e.target.value })}
                  className="w-full rounded-md border border-border/60 bg-surface/50 px-2 py-1.5 text-sm focus:border-primary/40 focus:outline-none"
                />
                <select
                  value={row.entity}
                  onChange={(e) =>
                    update(row.id, { entity: e.target.value as "personal" | "avaken" })
                  }
                  className="w-full rounded-md border border-border/60 bg-surface/50 px-2 py-1.5 text-sm focus:border-primary/40 focus:outline-none"
                  style={{ borderColor: entityCfg ? `${entityCfg.accent}33` : undefined }}
                >
                  <option value="personal">Personal</option>
                  <option value="avaken">Avaken</option>
                </select>
                <select
                  value={row.type}
                  onChange={(e) => update(row.id, { type: e.target.value as TxnType })}
                  className="w-full rounded-md border border-border/60 bg-surface/50 px-2 py-1.5 text-sm focus:border-primary/40 focus:outline-none"
                >
                  {TXN_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  value={row.amount}
                  onChange={(e) => update(row.id, { amount: parseFloat(e.target.value) || 0 })}
                  className={cn(
                    "w-full rounded-md border border-border/60 bg-surface/50 px-2 py-1.5 text-right text-sm font-medium tabular-nums focus:border-primary/40 focus:outline-none",
                    row.amount >= 0 ? "text-positive" : "text-negative",
                  )}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-negative"
                  onClick={() => remove(row.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
                {row.confidence != null && (
                  <p className="col-span-full text-[10px] text-subtle lg:col-span-7">
                    AI confidence {Math.round(row.confidence * 100)}%
                    {row.sourceImageIndex != null && ` · screenshot #${row.sourceImageIndex + 1}`}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function MiniStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-card/60 px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-subtle">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums" style={accent ? { color: accent } : undefined}>
        {value}
      </p>
    </div>
  );
}
