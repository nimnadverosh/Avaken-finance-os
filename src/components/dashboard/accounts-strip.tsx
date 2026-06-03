import { Building2, CreditCard, Landmark, LineChart, PiggyBank } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type { Account, AccountType } from "@/lib/data/types";

const TYPE_ICON: Record<AccountType, typeof Building2> = {
  business: Building2,
  current: Landmark,
  savings: PiggyBank,
  investment: LineChart,
  credit: CreditCard,
};

export function AccountsStrip({ accounts }: { accounts: Account[] }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Accounts</h3>
          <p className="text-[11px] text-subtle">{accounts.length} connected · synced just now</p>
        </div>
        <span className="text-[11px] text-subtle">
          Total{" "}
          <span className="tabular font-medium text-foreground">
            {formatCurrency(accounts.reduce((a, b) => a + b.balance, 0))}
          </span>
        </span>
      </div>
      <div className="grid grid-cols-1 divide-y divide-border/60 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-3 xl:grid-cols-4">
        {accounts.map((a) => {
          const Icon = TYPE_ICON[a.type];
          return (
            <div key={a.id} className="group relative flex items-center gap-3 px-5 py-3.5">
              <div
                className="grid size-9 place-items-center rounded-lg ring-1"
                style={{
                  background: `${a.accent}1a`,
                  color: a.accent,
                  boxShadow: `inset 0 0 0 1px ${a.accent}33`,
                }}
              >
                <Icon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{a.name}</p>
                <p className="truncate text-[11px] text-subtle">
                  {a.institution} · {a.last4 !== "—" ? `••${a.last4}` : a.type}
                </p>
              </div>
              <div className="text-right">
                <p className="tabular text-sm font-semibold">{formatCurrency(a.balance)}</p>
                <p className="text-[10px] uppercase tracking-wide text-subtle">{a.currency}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
