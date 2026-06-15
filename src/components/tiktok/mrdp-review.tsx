"use client";

import { Building2, Package, TrendingUp, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { previewMrdpAssignment } from "@/lib/tiktok/mrdp-import";
import type {
  MrdpAssignmentMode,
  MrdpEntityAssignment,
  MrdpEntityChoice,
  MrdpQuarter,
  ParsedMrdpReport,
} from "@/lib/tiktok/mrdp-types";

const QUARTERS: MrdpQuarter[] = ["Q1", "Q2", "Q3", "Q4"];

const QUARTER_LABELS: Record<MrdpQuarter, string> = {
  Q1: "Jan – Mar",
  Q2: "Apr – Jun",
  Q3: "Jul – Sep",
  Q4: "Oct – Dec",
};

function EntityToggle({
  value,
  onChange,
  compact,
}: {
  value: MrdpEntityChoice;
  onChange: (v: MrdpEntityChoice) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "inline-flex rounded-lg bg-white/[0.04] p-0.5 ring-1 ring-white/[0.06]",
        compact && "text-xs",
      )}
    >
      <button
        type="button"
        onClick={() => onChange("personal")}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-all",
          value === "personal"
            ? "bg-info/20 text-info shadow-sm"
            : "text-muted-foreground hover:text-foreground",
          compact && "px-2 py-1",
        )}
      >
        <User className="size-3.5" />
        Personal
      </button>
      <button
        type="button"
        onClick={() => onChange("avaken")}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-all",
          value === "avaken"
            ? "bg-primary/20 text-primary shadow-sm"
            : "text-muted-foreground hover:text-foreground",
          compact && "px-2 py-1",
        )}
      >
        <Building2 className="size-3.5" />
        Avaken Ltd
      </button>
    </div>
  );
}

function ModeCard({
  mode,
  current,
  label,
  description,
  onSelect,
}: {
  mode: MrdpAssignmentMode;
  current: MrdpAssignmentMode;
  label: string;
  description: string;
  onSelect: (mode: MrdpAssignmentMode) => void;
}) {
  const selected = current === mode;
  return (
    <button
      type="button"
      onClick={() => onSelect(mode)}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-all",
        selected
          ? "border-primary/40 bg-primary/[0.06] ring-1 ring-primary/20"
          : "border-border/60 bg-card/40 hover:border-border-strong hover:bg-card/60",
      )}
    >
      <div
        className={cn(
          "mt-0.5 size-4 shrink-0 rounded-full border-2 transition-all",
          selected ? "border-primary bg-primary" : "border-muted-foreground/40",
        )}
      >
        {selected && <div className="m-auto mt-[3px] size-1.5 rounded-full bg-background" />}
      </div>
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}

/** Review & Import screen — the core confirmation step for MRDP imports. */
export function MrdpReviewScreen({
  report,
  assignment,
  onAssignmentChange,
}: {
  report: ParsedMrdpReport;
  assignment: MrdpEntityAssignment;
  onAssignmentChange: (a: MrdpEntityAssignment) => void;
}) {
  const activeQuarters = report.quarters.filter((q) => q.revenue > 0 || q.transactionCount > 0);
  const maxRevenue = Math.max(1, ...report.quarters.map((q) => q.revenue));
  const preview = previewMrdpAssignment(report, assignment);

  const setMode = (mode: MrdpAssignmentMode) => {
    onAssignmentChange({ ...assignment, mode });
  };

  const setQuarterEntity = (quarter: MrdpQuarter, entity: MrdpEntityChoice) => {
    onAssignmentChange({
      ...assignment,
      mode: "per-quarter",
      quarters: { ...assignment.quarters, [quarter]: entity },
    });
  };

  return (
    <div className="space-y-6">
      {/* Summary header */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <SummaryKpi
          icon={TrendingUp}
          label="Total revenue"
          value={formatCurrency(report.totalRevenue, { decimals: 2 })}
          accent="#10b981"
          sub={`Tax year ${report.year}`}
        />
        <SummaryKpi
          icon={Package}
          label="Transactions"
          value={formatNumber(report.totalTransactions)}
          accent="#a78bfa"
          sub={`${activeQuarters.length} active quarter${activeQuarters.length === 1 ? "" : "s"}`}
        />
        <SummaryKpi
          icon={Building2}
          label="Creator"
          value={report.creatorName}
          accent="#38bdf8"
          sub={report.relevantActivities || report.creatorType}
          isText
        />
      </div>

      {/* Quarterly breakdown */}
      <Card className="overflow-hidden">
        <div className="border-b border-border/60 px-5 py-4">
          <h3 className="text-sm font-semibold tracking-tight">Quarterly breakdown</h3>
          <p className="text-[11px] text-subtle">
            Revenue by calendar quarter · {report.currency}
          </p>
        </div>
        <div className="grid grid-cols-1 divide-y divide-border/60 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
          {QUARTERS.map((qKey) => {
            const q = report.quarters.find((x) => x.quarter === qKey)!;
            const hasData = q.revenue > 0 || q.transactionCount > 0;
            const entity =
              assignment.mode === "all-personal"
                ? "personal"
                : assignment.mode === "all-avaken"
                  ? "avaken"
                  : assignment.quarters[qKey];

            return (
              <div
                key={qKey}
                className={cn(
                  "flex flex-col px-5 py-4",
                  !hasData && "opacity-40",
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-subtle">
                      {qKey}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{QUARTER_LABELS[qKey]}</p>
                  </div>
                  {hasData && assignment.mode === "per-quarter" && (
                    <EntityToggle
                      value={entity}
                      onChange={(e) => setQuarterEntity(qKey, e)}
                      compact
                    />
                  )}
                </div>
                <p className="tabular mt-3 text-xl font-semibold">
                  {formatCurrency(q.revenue, { decimals: 2 })}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {q.transactionCount} transaction{q.transactionCount === 1 ? "" : "s"}
                </p>
                {hasData && (
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-emerald"
                      style={{ width: `${(q.revenue / maxRevenue) * 100}%` }}
                    />
                  </div>
                )}
                {hasData && assignment.mode !== "per-quarter" && (
                  <Badge
                    tone={entity === "avaken" ? "positive" : "info"}
                    className="mt-3 w-fit text-[10px]"
                  >
                    → {entity === "avaken" ? "Avaken Ltd" : "Personal"}
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Entity assignment */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold tracking-tight">Assign to entity</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Choose where this revenue lands in your ledger — you can assign everything to one
          entity or split by quarter
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <ModeCard
            mode="all-personal"
            current={assignment.mode}
            label="All Personal"
            description="Route every quarter to your personal accounts"
            onSelect={setMode}
          />
          <ModeCard
            mode="all-avaken"
            current={assignment.mode}
            label="All Avaken Ltd"
            description="Route every quarter to the company"
            onSelect={setMode}
          />
          <ModeCard
            mode="per-quarter"
            current={assignment.mode}
            label="Per quarter"
            description="Assign each quarter to Personal or Avaken Ltd individually"
            onSelect={setMode}
          />
        </div>

        {/* Attribution preview */}
        <div className="mt-5 rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/[0.05]">
          <p className="text-[11px] font-medium uppercase tracking-wider text-subtle">
            Import preview
          </p>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="size-4 text-primary" />
                <span className="text-sm text-muted-foreground">Avaken Ltd</span>
              </div>
              <span className="tabular text-sm font-semibold text-primary">
                {formatCurrency(preview.companyRevenue, { decimals: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="size-4 text-info" />
                <span className="text-sm text-muted-foreground">Personal</span>
              </div>
              <span className="tabular text-sm font-semibold text-info">
                {formatCurrency(preview.personalRevenue, { decimals: 2 })}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {report.warnings.length > 0 && (
        <div className="rounded-xl border border-warning/30 bg-warning/[0.05] px-4 py-3 text-[12px] text-warning">
          {report.warnings.map((w, i) => (
            <p key={i}>{w}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryKpi({
  icon: Icon,
  label,
  value,
  accent,
  sub,
  isText,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  accent: string;
  sub?: string;
  isText?: boolean;
}) {
  return (
    <Card className="relative overflow-hidden p-4">
      <div
        className="pointer-events-none absolute -right-6 -top-6 size-20 rounded-full opacity-20 blur-2xl"
        style={{ background: accent }}
      />
      <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
        <Icon className="size-3.5" style={{ color: accent }} />
        {label}
      </div>
      <p
        className={cn(
          "mt-1.5 font-semibold",
          isText ? "truncate text-sm" : "tabular text-lg",
        )}
      >
        {value}
      </p>
      {sub && <p className="truncate text-[11px] text-subtle">{sub}</p>}
    </Card>
  );
}
