"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Filter, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "./page-header";
import { ExpenseDonut } from "@/components/charts/expense-donut";
import { useEntity } from "@/lib/entity-context";
import {
  listSubscriptions,
  monthlySubscriptionSpend,
  subscriptionsByCategory,
  upcomingRenewals,
} from "@/lib/data/queries";
import { isRealDataMode } from "@/lib/data/real-data-mode";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export function SubscriptionsView() {
  const { entity, config } = useEntity();
  const [filter, setFilter] = useState<"all" | "active" | "trial" | "paused">("all");
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);

  const all = listSubscriptions(entity);
  const list = useMemo(() => (filter === "all" ? all : all.filter((s) => s.status === filter)), [all, filter]);
  const monthly = monthlySubscriptionSpend(entity);
  const annual = monthly * 12;
  const byCat = subscriptionsByCategory(entity);
  // Compute renewals client-only — depends on "now" and would otherwise cause hydration drift.
  const renewals = useMemo(() => (now == null ? [] : upcomingRenewals(entity, 30)), [entity, now]);

  if (isRealDataMode() && all.length === 0) {
    return (
      <div>
        <PageHeader
          title="Subscriptions"
          description="No subscription data — add subscriptions manually when you connect billing imports."
        />
        <Card className="border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Sample subscriptions are hidden while you use real TikTok earnings data. Bank balances
            and transactions still reflect your accounts.
          </p>
        </Card>
      </div>
    );
  }

  // Overlap detector — same aiCategory with >1 subscription
  const overlap = useMemo(() => {
    const groups = new Map<string, typeof all>();
    all.forEach((s) => {
      const arr = groups.get(s.aiCategory) ?? [];
      arr.push(s);
      groups.set(s.aiCategory, arr);
    });
    return [...groups.entries()]
      .filter(([cat, items]) => items.length >= 3 && cat !== "Financial")
      .map(([category, items]) => ({
        category,
        items,
        monthly: items.reduce((a, b) => a + (b.cadence === "annual" ? b.amount / 12 : b.amount), 0),
      }));
  }, [all]);

  return (
    <div>
      <PageHeader
        title="Subscriptions"
        description={`${all.length} ${config.label.toLowerCase()} subs · ${formatCurrency(monthly)}/mo · ${formatCurrency(annual)}/yr`}
      />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Card className="overflow-hidden xl:col-span-1">
          <div className="border-b border-border/60 px-5 py-3">
            <h3 className="text-sm font-semibold tracking-tight">Monthly mix</h3>
            <p className="text-[11px] text-subtle">By AI category</p>
          </div>
          <div className="p-5">
            <ExpenseDonut data={byCat} />
          </div>
        </Card>

        <Card className="overflow-hidden xl:col-span-2">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
            <div className="flex items-center gap-2">
              <CalendarClock className="size-4 text-info" />
              <div>
                <h3 className="text-sm font-semibold tracking-tight">Upcoming renewals</h3>
                <p className="text-[11px] text-subtle">Next 30 days</p>
              </div>
            </div>
            <span className="text-[11px] text-subtle">{renewals.length} scheduled</span>
          </div>
          <div className="divide-y divide-border/60">
            {renewals.map((s) => {
              const days = now == null ? null : Math.round((+new Date(s.nextRenewal) - now) / 86400_000);
              return (
                <div key={s.id} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 px-5 py-3">
                  <div
                    className="grid size-8 place-items-center rounded-md text-[11px] font-semibold"
                    style={{ background: `${s.accent}20`, color: s.accent }}
                  >
                    {s.name[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{s.name}</p>
                    <p className="truncate text-[11px] text-subtle">
                      {s.vendor} · {s.aiCategory}
                    </p>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {days == null ? "" : days <= 0 ? "today · " : `in ${days}d · `}
                    {formatDate(s.nextRenewal, { day: "numeric", month: "short" })}
                  </span>
                  <span className="tabular text-sm font-semibold">{formatCurrency(s.amount)}</span>
                </div>
              );
            })}
            {renewals.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                Nothing renewing in the next 30 days.
              </div>
            )}
          </div>
        </Card>
      </div>

      {overlap.length > 0 && (
        <Card className="mt-3 overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border/60 px-5 py-3">
            <Sparkles className="size-4 text-violet" />
            <div>
              <h3 className="text-sm font-semibold tracking-tight">AI: subscription overlap detected</h3>
              <p className="text-[11px] text-subtle">Categories with 3+ overlapping tools — consolidation candidates</p>
            </div>
          </div>
          <div className="divide-y divide-border/60">
            {overlap.map((o) => (
              <div key={o.category} className="px-5 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    {o.category}{" "}
                    <span className="text-subtle">— {o.items.length} subscriptions</span>
                  </p>
                  <span className="tabular text-sm font-semibold text-warning">
                    {formatCurrency(o.monthly)}/mo
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {o.items.map((i) => (
                    <span
                      key={i.id}
                      className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[11px] text-muted-foreground ring-1 ring-white/10"
                    >
                      {i.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="mt-6 flex items-center gap-2">
        <h2 className="text-sm font-semibold tracking-tight">All subscriptions</h2>
        <div className="ml-auto flex items-center gap-1 rounded-lg border border-border/80 bg-surface/60 p-0.5">
          <Filter className="ml-1 size-3 text-subtle" />
          {(["all", "active", "trial", "paused"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-md px-2 py-1 text-[10px] font-medium capitalize transition-colors",
                filter === f ? "bg-white/[0.07] text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {list.map((s) => (
          <Card key={s.id} className="overflow-hidden p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="grid size-9 place-items-center rounded-lg text-sm font-semibold"
                  style={{ background: `${s.accent}20`, color: s.accent }}
                >
                  {s.name[0]}
                </div>
                <div>
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-[11px] text-subtle">{s.vendor}</p>
                </div>
              </div>
              <Badge tone={s.entity === "avaken" ? "positive" : "info"}>
                {s.entity === "avaken" ? "Avaken" : "Personal"}
              </Badge>
            </div>
            <div className="mt-3 flex items-end justify-between">
              <div>
                <p className="tabular text-base font-semibold">{formatCurrency(s.amount)}</p>
                <p className="text-[10px] uppercase tracking-wide text-subtle">
                  {s.cadence === "annual" ? "per year" : s.cadence === "weekly" ? "per week" : "per month"}
                </p>
              </div>
              <span className="rounded-full bg-violet/10 px-2 py-0.5 text-[10px] font-medium text-violet ring-1 ring-violet/20">
                {s.aiCategory}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-subtle">
              <span>renews {formatDate(s.nextRenewal, { day: "numeric", month: "short" })}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize ring-1",
                  s.status === "active"
                    ? "bg-positive/12 text-positive ring-positive/20"
                    : s.status === "trial"
                      ? "bg-warning/12 text-warning ring-warning/20"
                      : "bg-white/[0.04] text-muted-foreground ring-white/10",
                )}
              >
                {s.status}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
