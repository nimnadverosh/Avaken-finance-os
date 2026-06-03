import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Transaction } from "@/lib/data/types";

const ENTITY_TONE = {
  personal: { dot: "#38bdf8", label: "Personal" },
  avaken: { dot: "#10b981", label: "Avaken" },
} as const;

export function TransactionsFeed({ transactions }: { transactions: Transaction[] }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Recent activity</h3>
          <p className="text-[11px] text-subtle">Entity-tagged · AI-categorised</p>
        </div>
        <button className="text-[11px] text-muted-foreground hover:text-foreground">View all →</button>
      </div>

      <div className="divide-y divide-border/60">
        {transactions.map((t) => {
          const positive = t.amount >= 0;
          const ent = ENTITY_TONE[t.entity];
          return (
            <div key={t.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-5 py-3">
              <span
                className="size-2 rounded-full"
                style={{ background: ent.dot, boxShadow: `0 0 8px ${ent.dot}66` }}
                title={ent.label}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{t.description}</p>
                  {t.aiCategorised && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-violet/12 px-1.5 py-0.5 text-[10px] font-medium text-violet ring-1 ring-violet/20"
                      title="Auto-categorised by AI"
                    >
                      <Sparkles className="size-2.5" />
                      {t.category}
                    </span>
                  )}
                  {!t.aiCategorised && (
                    <span className="rounded-full bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-muted-foreground ring-1 ring-white/10">
                      {t.category}
                    </span>
                  )}
                  {t.status === "pending" && (
                    <Badge tone="warning" className="text-[10px]">pending</Badge>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-subtle">
                  {formatDate(t.date)} · {t.counterparty}
                  {t.vat !== 0 && (
                    <span className="ml-1.5 rounded bg-warning/10 px-1 py-px font-medium text-warning">
                      VAT {formatCurrency(Math.abs(t.vat))}
                    </span>
                  )}
                </p>
              </div>
              <p
                className={`tabular text-sm font-semibold ${
                  positive ? "text-positive" : "text-foreground"
                }`}
              >
                {positive ? "+" : ""}
                {formatCurrency(t.amount)}
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
