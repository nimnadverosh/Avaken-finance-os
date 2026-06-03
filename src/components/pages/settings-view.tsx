"use client";

import { Bot, CreditCard, KeyRound, Plug, ShieldCheck, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "./page-header";

const CONNECTIONS = [
  { id: "stripe", name: "Stripe", description: "Affiliate revenue → Tide payouts", status: "connected", color: "#635bff", initial: "S" },
  { id: "tide", name: "Tide Business", description: "Avaken Ltd operating + reserve accounts", status: "connected", color: "#10b981", initial: "T" },
  { id: "starling", name: "Starling", description: "Personal current account", status: "connected", color: "#7c5cff", initial: "S" },
  { id: "rbs", name: "RBS", description: "Personal current account", status: "connected", color: "#3b82f6", initial: "R" },
  { id: "barclays", name: "Barclays", description: "Personal saver", status: "connected", color: "#38bdf8", initial: "B" },
  { id: "etoro", name: "eToro", description: "Personal portfolio", status: "connected", color: "#22c55e", initial: "E" },
  { id: "tiktok", name: "TikTok Shop", description: "Affiliate metrics for 6 accounts", status: "pending", color: "#fa3253", initial: "T" },
  { id: "openai", name: "OpenAI", description: "AI categorisation + insights", status: "connected", color: "#10a37f", initial: "O" },
] as const;

export function SettingsView() {
  return (
    <div>
      <PageHeader title="Settings" description="Account, connections and tax configuration" />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {/* Profile */}
        <Card className="p-5 lg:col-span-1">
          <SectionTitle icon={User} title="Director profile" />
          <div className="mt-4 flex items-center gap-3">
            <div className="grid size-14 place-items-center rounded-xl bg-gradient-to-br from-violet to-info text-base font-semibold text-white shadow-inner">
              DR
            </div>
            <div>
              <p className="text-sm font-semibold">Director</p>
              <p className="text-[11px] text-subtle">director@avaken.co.uk</p>
              <Badge tone="positive" className="mt-1.5">UK · FY2025/26</Badge>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
            <Field label="Company" value="Avaken Ltd" />
            <Field label="VAT no." value="GB123456789" />
            <Field label="Company no." value="14829301" />
            <Field label="Year end" value="31 Mar" />
          </div>
        </Card>

        {/* Tax settings */}
        <Card className="p-5 lg:col-span-2">
          <SectionTitle icon={CreditCard} title="Tax & VAT configuration" />
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Toggle label="VAT registered" desc="Quarterly MTD filing enabled" on />
            <Toggle label="Auto-reserve" desc="Set aside 20% of every Stripe payout" on />
            <Toggle label="Marginal relief computation" desc="Apply 3/200 standard fraction" on />
            <Toggle label="Dividend allowance" desc="Track £500 annual tax-free band" on />
            <Toggle label="Director's salary" desc="£12,570 PA-only tax-efficient" on />
            <Toggle label="Personal allowance taper" desc="Apply for income > £100k" on />
          </div>
        </Card>

        {/* Connections */}
        <Card className="p-5 lg:col-span-3">
          <SectionTitle icon={Plug} title="Connections" />
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {CONNECTIONS.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-xl border border-border/70 bg-white/[0.015] p-3"
              >
                <div
                  className="grid size-10 place-items-center rounded-lg text-sm font-semibold"
                  style={{ background: `${c.color}20`, color: c.color }}
                >
                  {c.initial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{c.name}</p>
                  <p className="truncate text-[11px] text-subtle">{c.description}</p>
                </div>
                <Badge tone={c.status === "connected" ? "positive" : "warning"}>
                  {c.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* AI */}
        <Card className="p-5 lg:col-span-2">
          <SectionTitle icon={Bot} title="AI" />
          <div className="mt-4 space-y-3">
            <Toggle label="Auto-categorise transactions" desc="Run the AI categoriser on every new transaction (≥0.85 confidence)" on />
            <Toggle label="Subscription overlap detection" desc="Surface duplicate-purpose tools every Sunday" on />
            <Toggle label="Daily AI brief" desc="Email summary at 08:00 GMT" off />
            <Toggle label="Anomaly alerts" desc="Notify on transactions >2σ above category average" on />
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle icon={ShieldCheck} title="Security" />
          <div className="mt-4 space-y-3">
            <Toggle label="2-factor authentication" desc="Required for HMRC submissions" on />
            <Toggle label="Audit log retention" desc="Keep 6 years (HMRC default)" on />
            <Button variant="outline" size="sm" className="mt-1 w-full">
              <KeyRound className="size-3.5" /> Rotate API keys
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: typeof User; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="grid size-7 place-items-center rounded-lg bg-white/[0.04] ring-1 ring-white/10">
        <Icon className="size-3.5 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/[0.03] px-3 py-2 ring-1 ring-white/5">
      <p className="text-[10px] uppercase tracking-wide text-subtle">{label}</p>
      <p className="tabular mt-0.5 text-xs font-medium">{value}</p>
    </div>
  );
}

function Toggle({ label, desc, on, off }: { label: string; desc: string; on?: boolean; off?: boolean }) {
  const enabled = on ?? !off;
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-white/[0.015] px-4 py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{desc}</p>
      </div>
      <span
        className={`mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          enabled ? "bg-primary/80" : "bg-white/[0.08]"
        }`}
      >
        <span
          className={`block size-3.5 rounded-full bg-white transition-transform ${
            enabled ? "translate-x-[18px]" : "translate-x-[2px]"
          }`}
        />
      </span>
    </div>
  );
}
