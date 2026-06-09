"use client";

import { useMemo } from "react";
import { Building2, PiggyBank, ShieldCheck, Sparkles, User, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "./page-header";
import { getTaxClarity } from "@/lib/tax/tax-clarity";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const COMPANY_COLOR = "#10b981";
const PERSONAL_COLOR = "#38bdf8";

export function TaxClarityView() {
  const data = useMemo(() => getTaxClarity(), []);

  const maxRevenue = Math.max(...data.perAccount.map((a) => a.quarter), 1);
  const companyShare = data.totalRevenue === 0 ? 0 : data.companyRevenue / data.totalRevenue;

  return (
    <div>
      <PageHeader
        title="Tax Clarity"
        description={`A calm view of what to set aside this quarter · ${data.quarterLabel}`}
      />

      {/* ---------- Top row: 4 KPIs ---------- */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={Wallet}
          label="Total Revenue"
          sub="this quarter"
          value={formatCurrency(data.totalRevenue)}
          accent="#a78bfa"
        />
        <Kpi
          icon={Building2}
          label="Company Revenue"
          sub="Avaken Ltd · Tide"
          value={formatCurrency(data.companyRevenue)}
          accent={COMPANY_COLOR}
        />
        <Kpi
          icon={User}
          label="Personal Revenue"
          sub="personal banks"
          value={formatCurrency(data.personalRevenue)}
          accent={PERSONAL_COLOR}
        />
        <Kpi
          icon={ShieldCheck}
          label="Tax Reserve Needed"
          sub="set aside in total"
          value={formatCurrency(data.totalReserve)}
          accent="#f59e0b"
          emphasis
        />
      </div>

      {/* ---------- Middle: revenue per account ---------- */}
      <Card className="mt-3 overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-border/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Revenue per TikTok account</h3>
            <p className="text-[11px] text-subtle">Where each account pays, this quarter</p>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
            <LegendDot color={COMPANY_COLOR} label="Company" />
            <LegendDot color={PERSONAL_COLOR} label="Personal" />
          </div>
        </div>

        {/* Split summary bar */}
        <div className="px-5 pt-4">
          <div className="flex h-2 overflow-hidden rounded-full bg-white/[0.04]">
            <div
              className="h-full rounded-l-full transition-all"
              style={{ width: `${companyShare * 100}%`, background: COMPANY_COLOR }}
            />
            <div
              className="h-full transition-all"
              style={{ width: `${(1 - companyShare) * 100}%`, background: PERSONAL_COLOR }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-subtle">
            <span>{Math.round(companyShare * 100)}% company</span>
            <span>{Math.round((1 - companyShare) * 100)}% personal</span>
          </div>
        </div>

        <div className="space-y-1 p-3 sm:p-4">
          {data.perAccount.map((a) => {
            const color = a.payTo === "company" ? COMPANY_COLOR : PERSONAL_COLOR;
            return (
              <div
                key={a.id}
                className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-white/[0.02]"
              >
                <div className="hidden w-44 shrink-0 sm:block">
                  <p className="truncate text-sm font-medium text-foreground">{a.handle}</p>
                  <p className="truncate text-[11px] text-subtle">{a.niche}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between sm:hidden">
                    <span className="truncate text-sm font-medium">{a.handle}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.04]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${(a.quarter / maxRevenue) * 100}%`, background: color }}
                    />
                  </div>
                </div>
                <Badge
                  tone={a.payTo === "company" ? "positive" : "info"}
                  className="hidden shrink-0 sm:inline-flex"
                >
                  {a.payTo === "company" ? "Company" : "Personal"}
                </Badge>
                <div className="w-24 shrink-0 text-right">
                  <p className="tabular text-sm font-semibold">{formatCurrency(a.quarter)}</p>
                  <p className="text-[11px] text-subtle">{Math.round(a.share * 100)}%</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ---------- Bottom: tax breakdown ---------- */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold tracking-tight">Tax breakdown</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Suggested reserves so nothing catches you out at filing.
        </p>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
        {data.lines.map((line) => (
          <ReserveCard key={line.id} line={line} />
        ))}
      </div>

      {/* Estimated net after tax */}
      <Card className="relative mt-3 overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 size-44 rounded-full bg-positive/30 opacity-20 blur-3xl" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-positive/12 text-positive ring-1 ring-positive/20">
                <PiggyBank className="size-4" />
              </span>
              <p className="text-xs uppercase tracking-wide text-subtle">Estimated net after tax</p>
            </div>
            <p className="tabular mt-3 text-4xl font-semibold tracking-tight text-foreground">
              {formatCurrency(data.netAfterTax)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatCurrency(data.totalRevenue)} revenue − {formatCurrency(data.totalReserve)} reserved
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-positive/10 px-3.5 py-2.5 text-[12px] text-positive ring-1 ring-positive/20">
            <Sparkles className="size-3.5 shrink-0" />
            <span>
              Keep{" "}
              <span className="font-semibold">
                {Math.round((data.totalReserve / data.totalRevenue) * 100)}%
              </span>{" "}
              aside and the rest is genuinely yours.
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Kpi({
  icon: Icon,
  label,
  sub,
  value,
  accent,
  emphasis = false,
}: {
  icon: typeof Wallet;
  label: string;
  sub: string;
  value: string;
  accent: string;
  emphasis?: boolean;
}) {
  return (
    <Card className={cn("relative overflow-hidden p-5", emphasis && "ring-1 ring-warning/20")}>
      <div
        className="pointer-events-none absolute -right-8 -top-10 size-28 rounded-full opacity-20 blur-2xl"
        style={{ background: accent }}
      />
      <div className="flex items-center gap-2">
        <span
          className="grid size-8 place-items-center rounded-lg ring-1"
          style={{ background: `${accent}1a`, color: accent, boxShadow: `inset 0 0 0 1px ${accent}33` }}
        >
          <Icon className="size-4" />
        </span>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      </div>
      <p className="tabular mt-4 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      <p className="mt-0.5 text-[11px] text-subtle">{sub}</p>
    </Card>
  );
}

function ReserveCard({ line }: { line: import("@/lib/tax/tax-clarity").ReserveLine }) {
  const hasReserve = line.reserved > 0;
  const coverage = Math.max(0, Math.min(1, line.coverage));
  const covered = hasReserve && line.coverage >= 1;
  const shortfall = Math.max(0, line.amount - line.reserved);

  return (
    <Card className="relative overflow-hidden p-5">
      <div
        className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full opacity-20 blur-2xl"
        style={{ background: line.accent }}
      />
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{line.label}</p>
        <span className="size-2 rounded-full" style={{ background: line.accent, boxShadow: `0 0 10px ${line.accent}` }} />
      </div>

      <p className="tabular mt-2 text-2xl font-semibold tracking-tight">{formatCurrency(line.amount)}</p>
      <p className="mt-1 text-[11px] leading-snug text-subtle">{line.basis}</p>

      {hasReserve ? (
        <div className="mt-4 space-y-1.5">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
            <div
              className="h-full rounded-full"
              style={{
                width: `${coverage * 100}%`,
                background: covered ? "#22c55e" : line.accent,
              }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-subtle">{line.accountName}</span>
            <span className={cn("font-medium", covered ? "text-positive" : "text-warning")}>
              {covered ? "Covered" : `Reserve ${formatCurrency(shortfall)} more`}
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-info/10 px-3 py-2 text-[11px] text-info ring-1 ring-info/20">
          <PiggyBank className="size-3.5 shrink-0" />
          <span>Reserve {formatCurrency(line.amount)} into a separate pot.</span>
        </div>
      )}
    </Card>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="size-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
