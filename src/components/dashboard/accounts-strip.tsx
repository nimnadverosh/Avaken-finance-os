"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  Check,
  CreditCard,
  Landmark,
  LineChart,
  Pencil,
  PiggyBank,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import {
  formatCurrencyInput,
  parseCurrencyInput,
  reconcileDailySnapshotFromLedger,
} from "@/lib/data/daily-updates";
import { setAccountBalances } from "@/lib/data/mock-account-balances";
import type { Account, AccountType } from "@/lib/data/types";
import { useMockDataVersion } from "@/hooks/use-mock-data-version";
import { cn } from "@/lib/utils";

const TYPE_ICON: Record<AccountType, typeof Building2> = {
  business: Building2,
  current: Landmark,
  savings: PiggyBank,
  investment: LineChart,
  credit: CreditCard,
};

type AccountGroup = "operating" | "reserves" | "credit" | "investment";

const GROUP_META: Record<AccountGroup, { label: string; hint: string }> = {
  operating: {
    label: "Bank & operating",
    hint: "Current accounts and business cash",
  },
  reserves: {
    label: "Tax & VAT reserves",
    hint: "Set-aside for HMRC liabilities",
  },
  credit: {
    label: "Credit cards",
    hint: "Outstanding balances owed",
  },
  investment: {
    label: "Investments",
    hint: "Portfolio value",
  },
};

const GROUP_ORDER: AccountGroup[] = ["operating", "reserves", "credit", "investment"];

function accountGroup(account: Account): AccountGroup {
  if (account.id === "tide-vat" || account.id === "tide-tax") return "reserves";
  if (account.type === "credit") return "credit";
  if (account.type === "investment") return "investment";
  return "operating";
}

function groupAccounts(accounts: Account[]): Map<AccountGroup, Account[]> {
  const map = new Map<AccountGroup, Account[]>();
  for (const group of GROUP_ORDER) map.set(group, []);
  for (const account of accounts) {
    map.get(accountGroup(account))!.push(account);
  }
  return map;
}

export function AccountsStrip({ accounts }: { accounts: Account[] }) {
  useMockDataVersion();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const grouped = useMemo(() => groupAccounts(accounts), [accounts]);

  const startEditing = useCallback(() => {
    setDraft(
      Object.fromEntries(
        accounts.map((a) => [a.id, formatCurrencyInput(a.balance)]),
      ),
    );
    setError(null);
    setSaved(false);
    setEditing(true);
  }, [accounts]);

  const cancelEditing = useCallback(() => {
    setEditing(false);
    setDraft({});
    setError(null);
  }, []);

  useEffect(() => {
    if (!saved) return;
    const timer = window.setTimeout(() => setSaved(false), 3500);
    return () => window.clearTimeout(timer);
  }, [saved]);

  const changedCount = useMemo(() => {
    if (!editing) return 0;
    return accounts.filter((a) => {
      const parsed = parseCurrencyInput(draft[a.id] ?? "");
      return parsed !== null && Math.abs(parsed - a.balance) > 0.005;
    }).length;
  }, [editing, accounts, draft]);

  const handleSave = () => {
    setError(null);
    const updates: Record<string, number> = {};

    for (const account of accounts) {
      const parsed = parseCurrencyInput(draft[account.id] ?? "");
      if (parsed === null) {
        setError(`Enter a valid amount for ${account.name}.`);
        return;
      }
      if (Math.abs(parsed - account.balance) > 0.005) {
        updates[account.id] = parsed;
      }
    }

    setSaving(true);
    try {
      if (Object.keys(updates).length > 0) {
        setAccountBalances(updates);
        reconcileDailySnapshotFromLedger();
      }
      setEditing(false);
      setDraft({});
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const total = accounts.reduce((sum, a) => sum + a.balance, 0);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border/60 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Accounts</h3>
          <p className="text-[11px] text-subtle">
            {accounts.length} connected
            {editing ? (
              <> · editing {changedCount > 0 ? `${changedCount} change${changedCount === 1 ? "" : "s"}` : "balances"}</>
            ) : saved ? (
              <> · <span className="text-primary">balances saved</span></>
            ) : (
              <> · tap a balance or correct below</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!editing && (
            <span className="text-[11px] text-subtle">
              Total{" "}
              <span className="tabular font-medium text-foreground">
                {formatCurrency(total)}
              </span>
            </span>
          )}
          {editing ? (
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={cancelEditing}>
                <X className="size-3.5" />
                Cancel
              </Button>
              <Button type="button" size="sm" disabled={saving} onClick={handleSave}>
                <Check className="size-3.5" />
                {saving ? "Saving…" : changedCount > 0 ? `Save ${changedCount}` : "Done"}
              </Button>
            </div>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={startEditing}>
              <Pencil className="size-3.5" />
              Correct balances
            </Button>
          )}
        </div>
      </div>

      {error && (
        <p className="border-b border-negative/20 bg-negative/10 px-5 py-2 text-sm text-negative">
          {error}
        </p>
      )}

      {editing ? (
        <div className="divide-y divide-border/60">
          {GROUP_ORDER.map((group) => {
            const items = grouped.get(group)!;
            if (items.length === 0) return null;
            const meta = GROUP_META[group];
            return (
              <div key={group}>
                <div className="border-b border-border/40 bg-white/[0.02] px-5 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {meta.label}
                  </p>
                  <p className="text-[10px] text-subtle">{meta.hint}</p>
                </div>
                <div className="grid grid-cols-1 divide-y divide-border/60 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-3 xl:grid-cols-4">
                  {items.map((a) => (
                    <AccountEditRow
                      key={a.id}
                      account={a}
                      value={draft[a.id] ?? ""}
                      original={a.balance}
                      onChange={(v) => setDraft((prev) => ({ ...prev, [a.id]: v }))}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 divide-y divide-border/60 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-3 xl:grid-cols-4">
          {accounts.map((a) => (
            <AccountViewRow key={a.id} account={a} onEdit={startEditing} />
          ))}
        </div>
      )}
    </Card>
  );
}

function AccountViewRow({
  account,
  onEdit,
}: {
  account: Account;
  onEdit: () => void;
}) {
  const Icon = TYPE_ICON[account.type];

  return (
    <button
      type="button"
      onClick={onEdit}
      className="group flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-white/[0.03]"
      title="Click to correct balance"
    >
      <div
        className="grid size-9 shrink-0 place-items-center rounded-lg ring-1"
        style={{
          background: `${account.accent}1a`,
          color: account.accent,
          boxShadow: `inset 0 0 0 1px ${account.accent}33`,
        }}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{account.name}</p>
        <p className="truncate text-[11px] text-subtle">
          {account.institution} · {account.last4 !== "—" ? `••${account.last4}` : account.type}
        </p>
      </div>
      <div className="text-right">
        <p className="tabular text-sm font-semibold transition-colors group-hover:text-primary">
          {account.currency === "USD"
            ? `$${account.balance.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`
            : formatCurrency(account.balance)}
        </p>
        <p className="flex items-center justify-end gap-1 text-[10px] uppercase tracking-wide text-subtle">
          <Pencil className="size-2.5 opacity-0 transition-opacity group-hover:opacity-60" />
          {account.currency}
        </p>
      </div>
    </button>
  );
}

function AccountEditRow({
  account,
  value,
  original,
  onChange,
}: {
  account: Account;
  value: string;
  original: number;
  onChange: (value: string) => void;
}) {
  const Icon = TYPE_ICON[account.type];
  const parsed = parseCurrencyInput(value);
  const changed = parsed !== null && Math.abs(parsed - original) > 0.005;
  const prefix = account.currency === "USD" ? "$" : "£";

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-5 py-3.5",
        changed && "bg-amber-500/[0.06]",
      )}
    >
      <div
        className="grid size-9 shrink-0 place-items-center rounded-lg ring-1"
        style={{
          background: `${account.accent}1a`,
          color: account.accent,
          boxShadow: `inset 0 0 0 1px ${account.accent}33`,
        }}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{account.name}</p>
        <p className="truncate text-[11px] text-subtle">
          {account.institution} · {account.last4 !== "—" ? `••${account.last4}` : account.type}
        </p>
      </div>
      <div className="relative w-[7.5rem] shrink-0">
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-subtle">
          {prefix}
        </span>
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          aria-label={`${account.name} balance`}
          className={cn(
            "w-full rounded-lg border bg-white/[0.03] py-2 pl-6 pr-2 text-right text-sm tabular outline-none transition-colors",
            "focus:border-primary/40 focus:ring-2 focus:ring-primary/20",
            changed ? "border-amber-500/50" : "border-border/70",
          )}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}
