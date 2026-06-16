"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  CreditCard,
  Landmark,
  PiggyBank,
  Plus,
  Trash2,
  User,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { useClientStorageReady } from "@/hooks/use-client-storage-ready";
import { useMockDataVersion } from "@/hooks/use-mock-data-version";
import { formatCurrency } from "@/lib/format";
import { getAccounts } from "@/lib/data/queries";
import {
  addCustomAccount,
  getCustomAccounts,
  INSTITUTION_PRESETS,
  isSeedAccount,
  removeCustomAccount,
  type AddAccountKind,
  type StoredEntity,
} from "@/lib/data/accounts-store";
import { setAccountBalances } from "@/lib/data/mock-account-balances";
import type { Account, AccountType } from "@/lib/data/types";
import { cn } from "@/lib/utils";

const TYPE_ICON: Record<AccountType, typeof Landmark> = {
  business: Building2,
  current: Landmark,
  savings: PiggyBank,
  investment: Landmark,
  credit: CreditCard,
};

type EntityTab = StoredEntity;

const ENTITY_META: Record<EntityTab, { label: string; icon: typeof User; desc: string }> = {
  personal: {
    label: "Personal",
    icon: User,
    desc: "Current accounts, savers, and personal credit cards",
  },
  avaken: {
    label: "Avaken Ltd",
    icon: Building2,
    desc: "Business operating, reserves, and company credit cards",
  },
};

function isBankAccount(a: Account): boolean {
  return a.type !== "credit" && a.type !== "investment";
}

/** Settings UI for adding and managing bank accounts and credit cards by entity. */
export function BankAccountsManager() {
  const storageReady = useClientStorageReady();
  const version = useMockDataVersion();
  const { toast, node: toastNode } = useToast();
  const [tab, setTab] = useState<EntityTab>("personal");
  const [kind, setKind] = useState<AddAccountKind>("bank");
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState<string>(INSTITUTION_PRESETS[0]!.name);
  const [customInstitution, setCustomInstitution] = useState("");
  const [last4, setLast4] = useState("");
  const [balance, setBalance] = useState("");
  const [subtype, setSubtype] = useState<"current" | "savings" | "business">("current");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const entityCounts = useMemo(() => {
    if (!storageReady) return { personal: 0, avaken: 0 };
    return {
      personal: getAccounts("personal").length,
      avaken: getAccounts("avaken").length,
    };
  }, [storageReady, version]);

  const accounts = useMemo(
    () => (storageReady ? getAccounts(tab) : []),
    [tab, storageReady, version],
  );
  const bankAccounts = useMemo(() => accounts.filter(isBankAccount), [accounts]);
  const creditAccounts = useMemo(() => accounts.filter((a) => a.type === "credit"), [accounts]);
  const customIds = useMemo(
    () => (storageReady ? new Set(getCustomAccounts().map((a) => a.id)) : new Set<string>()),
    [storageReady, version],
  );

  const resolvedInstitution =
    institution === "Other" ? customInstitution.trim() || "Other" : institution;

  function resetForm() {
    setName("");
    setLast4("");
    setBalance("");
    setCustomInstitution("");
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!resolvedInstitution) return;

    const parsedBalance = balance.trim() ? parseFloat(balance.replace(/,/g, "")) : 0;
    const created = addCustomAccount({
      entity: tab,
      kind,
      name: name.trim() || `${resolvedInstitution} ${kind === "credit" ? "Credit" : "Account"}`,
      institution: resolvedInstitution,
      last4,
      balance: Number.isFinite(parsedBalance) ? parsedBalance : 0,
      subtype: tab === "avaken" ? (kind === "bank" ? subtype : undefined) : subtype,
    });

    if (parsedBalance !== 0) {
      setAccountBalances({ [created.id]: Math.abs(parsedBalance) });
    }

    resetForm();
    toast({
      title: `${created.name} added`,
      description: `Tracked under ${ENTITY_META[tab].label}. Update balances anytime on the dashboard.`,
      variant: "success",
    });
  }

  function handleRemove(account: Account) {
    if (isSeedAccount(account.id)) return;
    removeCustomAccount(account.id);
    setConfirmDeleteId(null);
    toast({
      title: `${account.name} removed`,
      description: "Account removed from your registry",
      variant: "success",
    });
  }

  return (
    <div className="space-y-4">
      {toastNode}

      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Bank accounts & credit cards</h3>
            <p className="mt-1 text-[11px] text-subtle">
              Manage personal and business accounts separately. Seed accounts are built-in; accounts
              you add can be removed anytime.
            </p>
          </div>
          <div className="flex rounded-xl border border-border/60 bg-white/[0.02] p-1">
            {(Object.keys(ENTITY_META) as EntityTab[]).map((entity) => {
              const meta = ENTITY_META[entity];
              const Icon = meta.icon;
              const count = entityCounts[entity];
              return (
                <button
                  key={entity}
                  type="button"
                  onClick={() => {
                    setTab(entity);
                    setSubtype(entity === "avaken" ? "business" : "current");
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                    tab === entity
                      ? "bg-primary/15 text-primary"
                      : "text-subtle hover:text-foreground",
                  )}
                >
                  <Icon className="size-3.5" />
                  {meta.label}
                  <Badge tone={tab === entity ? "info" : "neutral"}>{count}</Badge>
                </button>
              );
            })}
          </div>
        </div>

        <p className="mt-3 text-[11px] text-muted-foreground">{ENTITY_META[tab].desc}</p>

        <form onSubmit={handleAdd} className="mt-4 space-y-3 rounded-xl border border-border/60 bg-white/[0.015] p-4">
          <div className="flex flex-wrap gap-2">
            <KindPill active={kind === "bank"} onClick={() => setKind("bank")} label="Bank account" />
            <KindPill active={kind === "credit"} onClick={() => setKind("credit")} label="Credit card" />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Display name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={kind === "credit" ? "Amex Platinum" : "Starling Personal"}
                className={inputClass}
              />
            </Field>

            <Field label="Institution">
              <select
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                className={inputClass}
              >
                {INSTITUTION_PRESETS.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>

            {institution === "Other" && (
              <Field label="Institution name">
                <input
                  value={customInstitution}
                  onChange={(e) => setCustomInstitution(e.target.value)}
                  placeholder="Bank name"
                  className={inputClass}
                />
              </Field>
            )}

            {kind === "bank" && (
              <Field label="Account type">
                <select
                  value={subtype}
                  onChange={(e) => setSubtype(e.target.value as typeof subtype)}
                  className={inputClass}
                >
                  {tab === "avaken" ? (
                    <>
                      <option value="business">Operating</option>
                      <option value="savings">Reserve / savings</option>
                    </>
                  ) : (
                    <>
                      <option value="current">Current</option>
                      <option value="savings">Savings</option>
                    </>
                  )}
                </select>
              </Field>
            )}

            <Field label="Last 4 digits">
              <input
                value={last4}
                onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="1234"
                inputMode="numeric"
                className={inputClass}
              />
            </Field>

            <Field label={kind === "credit" ? "Outstanding balance" : "Current balance"}>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-subtle">
                  £
                </span>
                <input
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  placeholder="0.00"
                  inputMode="decimal"
                  className={cn(inputClass, "pl-7")}
                />
              </div>
            </Field>
          </div>

          <div className="flex justify-end">
            <Button type="submit" size="sm">
              <Plus className="size-3.5" />
              Add to {ENTITY_META[tab].label}
            </Button>
          </div>
        </form>
      </Card>

      {!storageReady ? (
        <Card className="border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">Loading saved accounts…</p>
        </Card>
      ) : (
        <>
          <AccountSection
            title="Bank accounts"
            hint="Current, savings, and business operating accounts"
            accounts={bankAccounts}
            customIds={customIds}
            confirmDeleteId={confirmDeleteId}
            onConfirmDelete={setConfirmDeleteId}
            onRemove={handleRemove}
          />

          <AccountSection
            title="Credit cards"
            hint="Outstanding balances owed — shown as debt in your net position"
            accounts={creditAccounts}
            customIds={customIds}
            confirmDeleteId={confirmDeleteId}
            onConfirmDelete={setConfirmDeleteId}
            onRemove={handleRemove}
          />
        </>
      )}
    </div>
  );
}

function KindPill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors",
        active
          ? "bg-primary/15 text-primary ring-1 ring-primary/30"
          : "bg-white/[0.04] text-subtle hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function AccountSection({
  title,
  hint,
  accounts,
  customIds,
  confirmDeleteId,
  onConfirmDelete,
  onRemove,
}: {
  title: string;
  hint: string;
  accounts: Account[];
  customIds: Set<string>;
  confirmDeleteId: string | null;
  onConfirmDelete: (id: string | null) => void;
  onRemove: (account: Account) => void;
}) {
  if (accounts.length === 0) {
    return (
      <Card className="border-dashed p-5 text-center">
        <p className="text-sm text-muted-foreground">No {title.toLowerCase()} yet — add one above.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {title}
        </p>
        <p className="text-[10px] text-subtle">{hint}</p>
      </div>
      <div className="grid gap-2">
        {accounts.map((account) => (
          <AccountRow
            key={account.id}
            account={account}
            isCustom={customIds.has(account.id)}
            isConfirming={confirmDeleteId === account.id}
            onConfirm={() => onConfirmDelete(account.id)}
            onCancelConfirm={() => onConfirmDelete(null)}
            onRemove={() => onRemove(account)}
          />
        ))}
      </div>
    </div>
  );
}

function AccountRow({
  account,
  isCustom,
  isConfirming,
  onConfirm,
  onCancelConfirm,
  onRemove,
}: {
  account: Account;
  isCustom: boolean;
  isConfirming: boolean;
  onConfirm: () => void;
  onCancelConfirm: () => void;
  onRemove: () => void;
}) {
  const Icon = TYPE_ICON[account.type];

  return (
    <Card className="flex items-center justify-between gap-3 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className="grid size-10 shrink-0 place-items-center rounded-lg ring-1"
          style={{
            background: `${account.accent}1a`,
            color: account.accent,
            boxShadow: `inset 0 0 0 1px ${account.accent}33`,
          }}
        >
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold">{account.name}</p>
            {!isCustom && (
              <Badge tone="neutral">Built-in</Badge>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-subtle">
            {account.institution}
            {account.last4 !== "—" ? ` · ••${account.last4}` : ""}
            {" · "}
            {formatCurrency(account.balance)}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {isCustom &&
          (isConfirming ? (
            <>
              <Button variant="outline" size="sm" onClick={onCancelConfirm}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-negative hover:bg-negative/90"
                onClick={onRemove}
              >
                Confirm delete
              </Button>
            </>
          ) : (
            <button
              type="button"
              onClick={onConfirm}
              aria-label={`Remove ${account.name}`}
              className="rounded-md p-2 text-subtle transition-colors hover:bg-negative/10 hover:text-negative"
            >
              <Trash2 className="size-4" />
            </button>
          ))}
      </div>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "h-10 w-full rounded-xl border border-border/60 bg-transparent px-3 text-sm outline-none transition-colors placeholder:text-subtle focus:border-primary/40";
