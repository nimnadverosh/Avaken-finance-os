"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, UserPlus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { useMockDataVersion } from "@/hooks/use-mock-data-version";
import { formatCurrency } from "@/lib/format";
import {
  addAffiliateAccount,
  getAffiliateAccounts,
  normalizeHandle,
  removeAffiliateAccount,
  type TikTokAffiliateProfile,
} from "@/lib/tiktok/accounts";
import { deleteTikTokUploadsForAccount, getTikTokUploads } from "@/lib/tiktok/store";

interface TikTokAccountManagerProps {
  compact?: boolean;
}

/** Add / remove TikTok Shop affiliate creator accounts. */
export function TikTokAccountManager({ compact = false }: TikTokAccountManagerProps) {
  const version = useMockDataVersion();
  const { toast, node: toastNode } = useToast();
  const accounts = useMemo(() => getAffiliateAccounts(), [version]);

  const [handle, setHandle] = useState("");
  const [niche, setNiche] = useState("");
  const [payTo, setPayTo] = useState<"personal" | "company">("personal");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const accountStats = useMemo(() => {
    const map = new Map<string, { revenue: number; months: number }>();
    for (const u of getTikTokUploads()) {
      const existing = map.get(u.accountId) ?? { revenue: 0, months: 0 };
      existing.revenue += u.summary.grossRevenue;
      existing.months += 1;
      map.set(u.accountId, existing);
    }
    return map;
  }, [version]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!handle.trim()) return;
    const created = await addAffiliateAccount({ handle, niche: niche || "TikTok Shop", payTo });
    setHandle("");
    setNiche("");
    toast({
      title: `${created.handle} added`,
      description: "Upload monthly earnings reports and assign them to this account.",
      variant: "success",
    });
  }

  async function handleRemove(account: TikTokAffiliateProfile) {
    const uploadsRemoved = await deleteTikTokUploadsForAccount(account.id);
    await removeAffiliateAccount(account.id);
    setConfirmDeleteId(null);
    toast({
      title: `${account.handle} removed`,
      description:
        uploadsRemoved > 0
          ? `${uploadsRemoved} uploaded month${uploadsRemoved === 1 ? "" : "s"} deleted · dashboard updated`
          : "Account removed from your registry",
      variant: "success",
    });
  }

  return (
    <div className="space-y-4">
      {toastNode}

      <Card className={compact ? "p-4" : "p-5"}>
        <div className="flex items-center gap-2">
          <UserPlus className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold tracking-tight">Affiliate accounts</h3>
          <Badge tone="info">{accounts.length}</Badge>
        </div>
        <p className="mt-1 text-[11px] text-subtle">
          Each account gets its own monthly Excel uploads. Dashboard totals combine all accounts.
        </p>

        <form onSubmit={handleAdd} className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex-1 space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground">Handle</span>
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="@your.tiktok"
              className="h-10 w-full rounded-xl border border-border/60 bg-transparent px-3 text-sm outline-none transition-colors placeholder:text-subtle focus:border-primary/40"
            />
          </label>
          <label className="flex-1 space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground">Niche</span>
            <input
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="Beauty, Tech, …"
              className="h-10 w-full rounded-xl border border-border/60 bg-transparent px-3 text-sm outline-none transition-colors placeholder:text-subtle focus:border-primary/40"
            />
          </label>
          <label className="space-y-1 sm:w-36">
            <span className="text-[11px] font-medium text-muted-foreground">Payout to</span>
            <select
              value={payTo}
              onChange={(e) => setPayTo(e.target.value as "personal" | "company")}
              className="h-10 w-full rounded-xl border border-border/60 bg-transparent px-3 text-sm outline-none focus:border-primary/40"
            >
              <option value="personal">Personal</option>
              <option value="company">Avaken Ltd</option>
            </select>
          </label>
          <Button type="submit" size="sm" className="h-10 shrink-0">
            <Plus className="size-3.5" /> Add
          </Button>
        </form>
      </Card>

      {accounts.length > 0 && (
        <div className="grid gap-2">
          {accounts.map((account) => {
            const stats = accountStats.get(account.id);
            const isConfirming = confirmDeleteId === account.id;
            return (
              <Card key={account.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="size-2 rounded-full"
                      style={{ background: account.accent }}
                    />
                    <p className="text-sm font-semibold">{account.handle}</p>
                    <Badge tone={account.payTo === "company" ? "positive" : "info"}>
                      {account.payTo === "company" ? "Avaken Ltd" : "Personal"}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-[11px] text-subtle">
                    {account.niche}
                    {stats
                      ? ` · ${stats.months} month${stats.months === 1 ? "" : "s"} · ${formatCurrency(stats.revenue, { decimals: 0 })} total`
                      : " · no uploads yet"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {isConfirming ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="bg-negative hover:bg-negative/90"
                        onClick={() => handleRemove(account)}
                      >
                        Confirm delete
                      </Button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(account.id)}
                      aria-label={`Remove ${account.handle}`}
                      className="rounded-md p-2 text-subtle transition-colors hover:bg-negative/10 hover:text-negative"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {accounts.length === 0 && (
        <Card className="border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Add your TikTok Shop creator accounts above, then upload monthly earnings reports for each one.
          </p>
        </Card>
      )}
    </div>
  );
}

/** Inline account picker used before or during Excel import. */
export function TikTokAccountSelect({
  value,
  onChange,
  suggestedHandle,
  suggestedPayTo = "personal",
  title = "Assign to account",
  description,
}: {
  value: string | null;
  onChange: (accountId: string) => void;
  suggestedHandle?: string;
  suggestedPayTo?: "personal" | "company";
  title?: string;
  description?: string;
}) {
  const version = useMockDataVersion();
  const accounts = useMemo(() => getAffiliateAccounts(), [version]);
  const [newHandle, setNewHandle] = useState(suggestedHandle ?? "");
  const [creating, setCreating] = useState(accounts.length === 0);

  const selected = value ? accounts.find((a) => a.id === value) : null;

  async function createFromSuggestion() {
    const h = newHandle.trim() || suggestedHandle || "@account";
    const created = await addAffiliateAccount({
      handle: normalizeHandle(h),
      niche: "TikTok Shop",
      payTo: suggestedPayTo,
    });
    onChange(created.id);
    setCreating(false);
  }

  if (accounts.length === 0 || creating) {
    return (
      <Card className="border-primary/20 bg-primary/[0.03] p-4">
        <p className="text-sm font-medium">Which account is this report for?</p>
        <p className="mt-1 text-[11px] text-subtle">
          {suggestedHandle
            ? `Detected creator: ${normalizeHandle(suggestedHandle)} — confirm or edit below.`
            : "Create an affiliate account to link this upload."}
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={newHandle}
            onChange={(e) => setNewHandle(e.target.value)}
            placeholder="@your.tiktok"
            className="h-10 flex-1 rounded-xl border border-border/60 bg-transparent px-3 text-sm outline-none focus:border-primary/40"
          />
          <Button type="button" onClick={createFromSuggestion} size="sm" className="h-10 shrink-0">
            Create & select
          </Button>
          {accounts.length > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setCreating(false)}>
              Pick existing
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-primary/[0.03] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-[11px] text-subtle">
            {description ??
              (selected
                ? `${selected.handle} · ${selected.niche}`
                : "Select which creator account this report belongs to")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className="h-10 min-w-[180px] rounded-xl border border-border/60 bg-background px-3 text-sm outline-none focus:border-primary/40"
          >
            <option value="" disabled>
              Select account…
            </option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.handle} · {a.niche}
              </option>
            ))}
          </select>
          <Button type="button" variant="outline" size="sm" onClick={() => setCreating(true)}>
            <Plus className="size-3.5" /> New
          </Button>
        </div>
      </div>
      {suggestedHandle && !selected && (
        <p className="mt-2 text-[11px] text-subtle">
          Tip: file shows creator{" "}
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => {
              const match = accounts.find(
                (a) => a.handle.toLowerCase() === normalizeHandle(suggestedHandle).toLowerCase(),
              );
              if (match) onChange(match.id);
              else {
                setNewHandle(suggestedHandle);
                setCreating(true);
              }
            }}
          >
            {normalizeHandle(suggestedHandle)}
          </button>
        </p>
      )}
    </Card>
  );
}
