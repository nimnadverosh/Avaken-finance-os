"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "./page-header";
import { avakenAnnualProfit, corpTaxEstimate, getPayrollPlan, getReserves, personalTaxEstimate } from "@/lib/data/queries";
import { isRealDataMode } from "@/lib/data/real-data-mode";
import { formatCurrency } from "@/lib/format";
import { LOWER_LIMIT, UPPER_LIMIT } from "@/lib/tax/uk-corp-tax";

export function TaxView() {
  const corp = corpTaxEstimate();
  const personal = personalTaxEstimate();
  const profit = avakenAnnualProfit();
  const payroll = getPayrollPlan();
  const corpReserve = getReserves("avaken").find((r) => r.label === "Corp Tax Reserve");
  const reserved = corpReserve?.reserved ?? 0;

  if (isRealDataMode() && profit === 0) {
    return (
      <div>
        <PageHeader
          title="Tax"
          description="Upload TikTok earnings reports to calculate corporation and personal tax estimates."
        />
        <Card className="border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No commission data yet. Import your monthly TikTok Shop reports to populate tax projections.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Tax"
        description="UK Corporation Tax · Personal Income Tax · Dividend Tax · NIC — projected for FY 2025/26"
      />

      {/* Corporation Tax */}
      <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card className="relative overflow-hidden p-6 lg:col-span-2">
          <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-violet/30 opacity-25 blur-3xl" />
          <div className="flex items-center gap-2">
            <Badge tone="violet">
              {corp.band === "small"
                ? "Small Profits Rate"
                : corp.band === "main"
                  ? "Main Rate"
                  : "Marginal Relief"}
            </Badge>
            <span className="text-xs text-muted-foreground">
              effective rate {(corp.rate * 100).toFixed(2)}%
            </span>
          </div>

          <p className="mt-3 text-xs uppercase tracking-wide text-subtle">
            Corporation Tax — Avaken Ltd
          </p>
          <p className="tabular mt-1 text-4xl font-semibold tracking-tight">
            {formatCurrency(corp.tax)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            on rolling profit of {formatCurrency(profit)}
          </p>

          <div className="mt-6 grid grid-cols-3 gap-4">
            <Mini label="Tax before relief" value={formatCurrency(corp.taxBeforeRelief)} />
            <Mini label="Marginal relief" value={formatCurrency(corp.marginalRelief)} sign="negative" />
            <Mini label="Net payable" value={formatCurrency(corp.tax)} bold />
          </div>

          {/* Band visualiser */}
          <div className="mt-6">
            <BandBar
              profit={profit}
              segments={[
                { from: 0, to: LOWER_LIMIT, rate: 0.19, color: "#10b981", label: "19% Small Profits" },
                { from: LOWER_LIMIT, to: UPPER_LIMIT, rate: 0.265, color: "#f59e0b", label: "Marginal Relief" },
                { from: UPPER_LIMIT, to: UPPER_LIMIT * 1.4, rate: 0.25, color: "#f43f5e", label: "25% Main Rate" },
              ]}
            />
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-border/60 px-5 py-3">
            <h3 className="text-sm font-semibold tracking-tight">Reserve coverage</h3>
            <p className="text-[11px] text-subtle">Tide · Corp Tax Reserve</p>
          </div>
          <div className="space-y-4 p-5">
            <div>
              <p className="tabular text-2xl font-semibold">{formatCurrency(reserved)}</p>
              <p className="text-[11px] text-subtle">reserved</p>
            </div>
            <Progress label="Coverage" value={corp.tax === 0 ? 1 : reserved / corp.tax} color="#a78bfa" />
            <div className="text-[11px] text-muted-foreground">
              Top up by{" "}
              <span className="font-semibold text-foreground">
                {formatCurrency(Math.max(0, corp.tax - reserved))}
              </span>{" "}
              to fully cover the projected liability.
            </div>
          </div>
        </Card>
      </section>

      {/* Personal tax */}
      <section className="mt-6">
        <h2 className="text-sm font-semibold tracking-tight">Personal — Director</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Salary {formatCurrency(payroll.salary)} + planned dividends {formatCurrency(payroll.dividends)} ·
          England, FY 2025/26
        </p>
      </section>

      <section className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-4">
        <BigStat
          label="Take-home"
          value={formatCurrency(personal.takeHome)}
          sub={`of ${formatCurrency(personal.total)} gross`}
          accent="#10b981"
        />
        <BigStat label="Income Tax" value={formatCurrency(personal.incomeTax)} accent="#f59e0b" />
        <BigStat label="Dividend Tax" value={formatCurrency(personal.dividendTax)} accent="#a78bfa" />
        <BigStat label="NIC" value={formatCurrency(personal.nic)} accent="#38bdf8" />
      </section>

      <Card className="mt-3 overflow-hidden">
        <div className="border-b border-border/60 px-5 py-3">
          <h3 className="text-sm font-semibold tracking-tight">Effective rate</h3>
          <p className="text-[11px] text-subtle">
            All-in {(personal.effectiveRate * 100).toFixed(1)}% on £{personal.total.toLocaleString()}
          </p>
        </div>
        <div className="space-y-3 p-5">
          <StackBar
            total={personal.total}
            slices={[
              { label: "Take-home", value: personal.takeHome, color: "#10b981" },
              { label: "Income Tax", value: personal.incomeTax, color: "#f59e0b" },
              { label: "Dividend Tax", value: personal.dividendTax, color: "#a78bfa" },
              { label: "NIC", value: personal.nic, color: "#38bdf8" },
            ]}
          />
        </div>
      </Card>
    </div>
  );
}

function Mini({ label, value, sign, bold }: { label: string; value: string; sign?: "negative"; bold?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-subtle">{label}</p>
      <p
        className={`tabular mt-0.5 text-sm ${bold ? "font-semibold" : ""} ${
          sign === "negative" ? "text-positive" : ""
        }`}
      >
        {sign === "negative" ? "− " : ""}
        {value}
      </p>
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

function BigStat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: string;
}) {
  return (
    <Card className="relative overflow-hidden p-4">
      <div
        className="pointer-events-none absolute -right-6 -top-6 size-20 rounded-full opacity-25 blur-2xl"
        style={{ background: accent }}
      />
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="tabular mt-1 text-xl font-semibold">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-subtle">{sub}</p>}
    </Card>
  );
}

function BandBar({
  profit,
  segments,
}: {
  profit: number;
  segments: { from: number; to: number; rate: number; color: string; label: string }[];
}) {
  const total = segments[segments.length - 1].to;
  const profitPct = Math.min(100, (profit / total) * 100);
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full">
        {segments.map((s) => {
          const w = ((s.to - s.from) / total) * 100;
          return (
            <div
              key={s.label}
              style={{ width: `${w}%`, background: s.color, opacity: 0.5 }}
              className="relative"
            >
              <span
                className="absolute inset-0"
                style={{ background: s.color }}
              />
            </div>
          );
        })}
      </div>
      <div className="relative mt-1.5 h-4">
        <div
          className="absolute top-0 -translate-x-1/2"
          style={{ left: `${profitPct}%` }}
        >
          <div className="h-2.5 w-px bg-foreground" />
          <span className="mt-0.5 inline-block whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[10px] font-semibold text-background">
            {formatCurrency(profit, { compact: true })}
          </span>
        </div>
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-subtle">
        {segments.map((s) => (
          <span key={s.label} className="flex items-center gap-1">
            <span className="size-1.5 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function StackBar({
  total,
  slices,
}: {
  total: number;
  slices: { label: string; value: number; color: string }[];
}) {
  return (
    <div>
      <div className="flex h-4 overflow-hidden rounded-full">
        {slices.map((s) => (
          <div
            key={s.label}
            style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
            title={`${s.label}: ${formatCurrency(s.value)}`}
          />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {slices.map((s) => (
          <div key={s.label} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2 ring-1 ring-white/5">
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="size-1.5 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
            <span className="tabular text-xs font-semibold">{formatCurrency(s.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
