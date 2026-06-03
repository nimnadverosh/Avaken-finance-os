"use client";

import { Download, FileBarChart2, FileSpreadsheet, FileText, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "./page-header";
import { useEntity } from "@/lib/entity-context";
import { getAuditLog } from "@/lib/data/queries";

const REPORTS = [
  {
    id: "pl",
    title: "Profit & Loss",
    description: "Revenue, expenses and net profit for the company year to date.",
    icon: FileBarChart2,
    accent: "#10b981",
    period: "Apr 2025 – Mar 2026",
  },
  {
    id: "vat",
    title: "VAT Return (MTD)",
    description: "9-box MTD return for the current quarter, ready to submit to HMRC.",
    icon: FileSpreadsheet,
    accent: "#f59e0b",
    period: "Q4 2025/26",
  },
  {
    id: "balance",
    title: "Balance Sheet",
    description: "Assets, liabilities and equity snapshot for Avaken Ltd.",
    icon: FileText,
    accent: "#a78bfa",
    period: "as of today",
  },
  {
    id: "transactions",
    title: "Transactions CSV",
    description: "Full audit-ready ledger for the selected entity & period.",
    icon: Download,
    accent: "#38bdf8",
    period: "last 12 months",
  },
] as const;

const ACTOR_BADGE = {
  system: { tone: "neutral" as const, label: "system" },
  ai: { tone: "violet" as const, label: "AI" },
  Director: { tone: "info" as const, label: "Director" },
} as const;

export function ReportsView() {
  const { entity, config } = useEntity();
  const audit = getAuditLog(entity, 20);

  return (
    <div>
      <PageHeader
        title="Reports & exports"
        description={`Generate audit-ready reports for ${config.label.toLowerCase()} · CSV / PDF / JSON`}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {REPORTS.map((r) => {
          const Icon = r.icon;
          return (
            <Card key={r.id} className="relative overflow-hidden p-5">
              <div
                className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full opacity-20 blur-2xl"
                style={{ background: r.accent }}
              />
              <div
                className="grid size-10 place-items-center rounded-lg ring-1"
                style={{
                  background: `${r.accent}1a`,
                  color: r.accent,
                  boxShadow: `inset 0 0 0 1px ${r.accent}33`,
                }}
              >
                <Icon className="size-4" />
              </div>
              <p className="mt-3 text-sm font-semibold tracking-tight">{r.title}</p>
              <p className="mt-1 text-[12px] leading-snug text-muted-foreground">{r.description}</p>
              <p className="mt-2 text-[11px] text-subtle">{r.period}</p>
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="outline" className="flex-1">
                  <FileText className="size-3.5" /> PDF
                </Button>
                <Button size="sm" variant="outline" className="flex-1">
                  <FileSpreadsheet className="size-3.5" /> CSV
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Audit log */}
      <Card className="mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-positive" />
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Audit log</h3>
              <p className="text-[11px] text-subtle">
                Immutable append-only · 6-year retention for HMRC compliance
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm">
            <Download className="size-3.5" /> Export full log
          </Button>
        </div>

        <div className="divide-y divide-border/60">
          {audit.map((row) => {
            const a = ACTOR_BADGE[row.actor as keyof typeof ACTOR_BADGE] ?? {
              tone: "neutral" as const,
              label: row.actor,
            };
            return (
              <div
                key={row.id}
                className="grid grid-cols-[120px_1fr_auto] items-center gap-3 px-5 py-3"
              >
                <span className="font-mono text-[11px] text-subtle">
                  {new Date(row.at).toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge tone={a.tone} className="text-[10px]">
                      {a.label}
                    </Badge>
                    <span className="rounded bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {row.action}
                    </span>
                    <span
                      className="size-1.5 rounded-full"
                      style={{ background: row.entity === "avaken" ? "#10b981" : "#38bdf8" }}
                      title={row.entity}
                    />
                  </div>
                  <p className="mt-1 truncate text-[13px] text-muted-foreground">{row.summary}</p>
                </div>
                <span className="hidden text-[10px] text-subtle md:inline">{row.ref}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
