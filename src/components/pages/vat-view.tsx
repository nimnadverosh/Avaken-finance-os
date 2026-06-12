"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, FileSpreadsheet, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "./page-header";
import { currentVatPeriod, listVatPeriods, vatNetDue } from "@/lib/data/queries";
import { isRealDataMode } from "@/lib/data/real-data-mode";
import { buildVatReturn } from "@/lib/tax/uk-vat";
import { formatCurrency, formatDate } from "@/lib/format";

const BOX_DESCRIPTIONS: Record<keyof ReturnType<typeof buildVatReturn>, string> = {
  box1: "VAT due on sales and other outputs",
  box2: "VAT due on acquisitions from EU member states",
  box3: "Total VAT due (Box 1 + Box 2)",
  box4: "VAT reclaimed on purchases and other inputs",
  box5: "Net VAT to pay HMRC",
  box6: "Total sales (excluding VAT)",
  box7: "Total purchases (excluding VAT)",
  box8: "Total EU supplies of goods",
  box9: "Total EU acquisitions of goods",
};

export function VatView() {
  const current = currentVatPeriod();
  const ret = buildVatReturn(current);
  const periods = listVatPeriods();
  const uploadVatDue = vatNetDue();
  const due = new Date(current.dueDate);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);
  const daysToDue = now == null ? null : Math.ceil((+due - now) / 86400_000);

  if (isRealDataMode()) {
    return (
      <div>
        <PageHeader
          title="VAT"
          description="Output VAT estimated from uploaded TikTok company commission (YTD)."
        />
        <Card className="p-6">
          <p className="text-xs uppercase tracking-wide text-subtle">Estimated output VAT (YTD)</p>
          <p className="tabular mt-2 text-4xl font-semibold">{formatCurrency(uploadVatDue)}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Calculated from your uploaded earnings reports. Upload each month to keep this current.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="VAT"
        description={`Quarterly MTD return · ${current.quarter} · period ${formatDate(current.periodStart)} → ${formatDate(current.periodEnd)}`}
        actions={
          <>
            <Button variant="outline" size="sm">
              <FileSpreadsheet className="size-3.5" /> Export
            </Button>
            <Button size="sm">
              <Send className="size-3.5" /> Submit to HMRC
            </Button>
          </>
        }
      />

      {/* Hero summary */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card className="relative overflow-hidden p-6 lg:col-span-2">
          <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-warning/30 opacity-20 blur-3xl" />
          <div className="flex items-center gap-2">
            <Badge tone="warning">Open</Badge>
            <span className="text-xs text-muted-foreground">
              {daysToDue == null ? "" : daysToDue > 0 ? `due in ${daysToDue} days · ` : "overdue · "}
              {formatDate(current.dueDate)}
            </span>
          </div>
          <p className="mt-3 text-xs uppercase tracking-wide text-subtle">Net VAT payable (Box 5)</p>
          <p className="tabular mt-1 text-4xl font-semibold tracking-tight">
            {formatCurrency(ret.box5)}
          </p>
          <div className="mt-6 grid grid-cols-3 gap-4">
            <Mini label="Sales (ex VAT)" value={formatCurrency(ret.box6)} />
            <Mini label="Purchases (ex VAT)" value={formatCurrency(ret.box7)} />
            <Mini label="Output – Input" value={formatCurrency(ret.box3 - ret.box4)} />
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-border/60 px-5 py-3">
            <h3 className="text-sm font-semibold tracking-tight">Period progress</h3>
            <p className="text-[11px] text-subtle">
              {now == null
                ? "—"
                : `Day ${Math.ceil((now - +new Date(current.periodStart)) / 86400_000)} of ${Math.ceil((+new Date(current.periodEnd) - +new Date(current.periodStart)) / 86400_000)}`}
            </p>
          </div>
          <div className="space-y-4 p-5">
            <Progress label="Period elapsed" value={progress(current.periodStart, current.periodEnd, now)} color="#38bdf8" />
            <Progress
              label="Reserve coverage"
              value={Math.min(1, 31_870 / ret.box5)}
              color="#10b981"
            />
            <div className="flex items-center gap-2 rounded-lg bg-positive/10 px-3 py-2 text-[11px] text-positive ring-1 ring-positive/20">
              <CheckCircle2 className="size-3.5" />
              Last 3 returns filed on time
            </div>
          </div>
        </Card>
      </div>

      {/* 9-box table */}
      <Card className="mt-3 overflow-hidden">
        <div className="border-b border-border/60 px-5 py-3">
          <h3 className="text-sm font-semibold tracking-tight">MTD VAT return — 9 boxes</h3>
          <p className="text-[11px] text-subtle">Computed in real time from the transaction ledger</p>
        </div>
        <div className="divide-y divide-border/60">
          {(Object.keys(ret) as (keyof typeof ret)[]).map((key) => {
            const num = parseInt(key.replace("box", ""), 10);
            const value = ret[key];
            const highlight = key === "box5";
            return (
              <div
                key={key}
                className={`grid grid-cols-[36px_1fr_auto] items-center gap-3 px-5 py-3 ${highlight ? "bg-warning/[0.04]" : ""}`}
              >
                <span className="tabular rounded-md bg-white/[0.05] px-2 py-0.5 text-center text-[11px] font-semibold text-muted-foreground">
                  {num}
                </span>
                <span className={`text-sm ${highlight ? "font-semibold" : ""}`}>
                  {BOX_DESCRIPTIONS[key]}
                </span>
                <span className={`tabular text-right text-sm ${highlight ? "font-semibold text-warning" : ""}`}>
                  {formatCurrency(value)}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* History */}
      <Card className="mt-3 overflow-hidden">
        <div className="border-b border-border/60 px-5 py-3">
          <h3 className="text-sm font-semibold tracking-tight">Filing history</h3>
        </div>
        <div className="divide-y divide-border/60">
          {periods.map((p) => {
            const net = p.vatOnSales - p.vatOnPurchases;
            return (
              <div
                key={p.quarter}
                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-5 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{p.quarter}</p>
                  <p className="text-[11px] text-subtle">
                    {formatDate(p.periodStart)} → {formatDate(p.periodEnd)}
                  </p>
                </div>
                <span className="hidden text-[11px] text-muted-foreground sm:inline">
                  due {formatDate(p.dueDate)}
                </span>
                <span className="tabular text-sm font-semibold">{formatCurrency(net)}</span>
                {p.status === "filed" ? (
                  <Badge tone="positive">
                    <CheckCircle2 className="size-3" />
                    filed
                  </Badge>
                ) : (
                  <Badge tone="warning">
                    <Clock className="size-3" />
                    {p.status}
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-subtle">{label}</p>
      <p className="tabular mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}

function Progress({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular font-semibold">{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)` }}
        />
      </div>
    </div>
  );
}

function progress(start: string, end: string, now: number | null) {
  if (now == null) return 0;
  const s = +new Date(start);
  const e = +new Date(end);
  return Math.max(0, Math.min(1, (now - s) / (e - s)));
}
