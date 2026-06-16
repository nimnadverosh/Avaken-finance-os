"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Sparkles,
  Sunrise,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getDailyUpdateHistory,
  getDefaultDailyFormValues,
  getLatestDailyUpdate,
  parseCurrencyInput,
  saveDailyBalanceUpdate,
  wasUpdatedToday,
  type DailyBalanceFormValues,
} from "@/lib/data/daily-updates";
import { formatCurrency, formatDate, greeting } from "@/lib/format";
import { useMockDataVersion } from "@/hooks/use-mock-data-version";
import { cn } from "@/lib/utils";

const fieldClass =
  "w-full rounded-xl border border-border/70 bg-white/[0.03] px-4 py-3 text-sm tabular text-foreground outline-none transition-colors placeholder:text-subtle focus:border-primary/40 focus:ring-2 focus:ring-primary/20";

export function MorningQuickUpdate() {
  useMockDataVersion();
  const [form, setForm] = useState<DailyBalanceFormValues>(() => getDefaultDailyFormValues());
  const [historyOpen, setHistoryOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const latest = getLatestDailyUpdate();
  const history = useMemo(() => getDailyUpdateHistory(7), [latest?.id, saved]);
  const doneToday = wasUpdatedToday();

  useEffect(() => {
    if (!saved) return;
    const timer = window.setTimeout(() => setSaved(false), 4000);
    return () => window.clearTimeout(timer);
  }, [saved]);

  const setField = useCallback(
    (key: keyof DailyBalanceFormValues, value: string) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setError(null);
    },
    [],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const personalBankTotal = parseCurrencyInput(form.personalBankTotal);
    const avakenTideBalance = parseCurrencyInput(form.avakenTideBalance);
    const creditCardDebt = parseCurrencyInput(form.creditCardDebt);

    if (
      personalBankTotal === null ||
      avakenTideBalance === null ||
      creditCardDebt === null
    ) {
      setError("Enter valid amounts (zero or positive numbers only).");
      return;
    }

    setSubmitting(true);
    try {
      await saveDailyBalanceUpdate({
        personalBankTotal,
        avakenTideBalance,
        creditCardDebt,
        notes: form.notes,
      });
      setSaved(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.08] via-card to-card p-0 shadow-[0_0_0_1px_rgba(16,185,129,0.12),0_24px_64px_-32px_rgba(16,185,129,0.35)]">
      <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 left-1/3 size-48 rounded-full bg-violet/10 blur-3xl" />

      <div className="relative border-b border-border/60 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/15 ring-1 ring-primary/25">
              <Sunrise className="size-5 text-primary" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                  {greeting()}
                </p>
                {doneToday ? (
                  <Badge tone="positive">Updated today</Badge>
                ) : (
                  <Badge tone="warning">Not updated yet</Badge>
                )}
              </div>
              <h2 className="mt-1 text-lg font-semibold tracking-tight sm:text-xl">
                Quick Morning Update
                <span className="ml-2 text-sm font-normal text-muted-foreground">(~30 sec)</span>
              </h2>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Enter your totals once — bank balances, Tide, and card debt refresh every KPI on
                the dashboard.
              </p>
            </div>
          </div>

          {latest && (
            <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-white/[0.03] px-3 py-2 text-[11px] text-muted-foreground">
              <Clock3 className="size-3.5 shrink-0" />
              Last saved{" "}
              <span className="font-medium text-foreground">
                {formatDate(latest.updatedAt, {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="relative space-y-5 px-5 py-5 sm:px-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MoneyField
            id="personal-bank"
            label="Personal bank total available"
            hint="Starling + RBS + Barclays combined"
            prefix="£"
            value={form.personalBankTotal}
            onChange={(v) => setField("personalBankTotal", v)}
          />
          <MoneyField
            id="avaken-tide"
            label="Avaken / Tide balance"
            hint="Tide business operating account"
            prefix="£"
            value={form.avakenTideBalance}
            onChange={(v) => setField("avakenTideBalance", v)}
          />
          <MoneyField
            id="credit-debt"
            label="Total credit card debt"
            hint="All personal cards combined"
            prefix="£"
            value={form.creditCardDebt}
            onChange={(v) => setField("creditCardDebt", v)}
          />
        </div>

        <div>
          <label htmlFor="daily-notes" className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Notes / upcoming big payments <span className="text-subtle">(optional)</span>
          </label>
          <textarea
            id="daily-notes"
            rows={2}
            placeholder="e.g. Corp tax £12k due 14 Jun · Amex payment Friday"
            className={cn(fieldClass, "resize-none")}
            value={form.notes}
            onChange={(e) => setField("notes", e.target.value)}
          />
        </div>

        {error && (
          <p className="rounded-lg border border-negative/30 bg-negative/10 px-3 py-2 text-sm text-negative">
            {error}
          </p>
        )}

        {saved && (
          <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
            <CheckCircle2 className="size-4 shrink-0" />
            KPIs updated — your dashboard reflects the new totals.
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="submit"
            size="lg"
            disabled={submitting}
            className="h-12 w-full px-8 text-base font-semibold shadow-[0_8px_32px_-8px_rgba(16,185,129,0.55)] sm:w-auto"
          >
            <Sparkles className="size-4" />
            {submitting ? "Saving…" : "Update all KPIs"}
          </Button>

          <Link
            href="/transactions"
            className="inline-flex items-center justify-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeftRight className="size-3.5" />
            Manual transaction entry
          </Link>
        </div>
      </form>

      {history.length > 0 && (
        <div className="border-t border-border/60 px-5 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => setHistoryOpen((open) => !open)}
            className="flex w-full items-center justify-between py-1 text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <span>
              Daily history <span className="text-subtle">· last {history.length} updates</span>
            </span>
            <ChevronDown
              className={cn("size-4 transition-transform", historyOpen && "rotate-180")}
            />
          </button>

          {historyOpen && (
            <ul className="mt-2 space-y-2 pb-2">
              {history.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-col gap-1 rounded-xl border border-border/60 bg-white/[0.02] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-xs font-medium">
                      {formatDate(entry.date, { weekday: "short", day: "numeric", month: "short" })}
                    </p>
                    {entry.notes ? (
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-subtle">{entry.notes}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] tabular text-muted-foreground">
                    <span>Personal {formatCurrency(entry.personalBankTotal)}</span>
                    <span>Tide {formatCurrency(entry.avakenTideBalance)}</span>
                    <span>Cards {formatCurrency(entry.creditCardDebt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}

function MoneyField({
  id,
  label,
  hint,
  prefix,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  prefix: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-subtle">
          {prefix}
        </span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0.00"
          className={cn(fieldClass, "pl-9")}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-subtle">{hint}</p>
    </div>
  );
}
