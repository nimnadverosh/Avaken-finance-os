"use client";

import { BankAccountsManager } from "@/components/settings/bank-accounts-manager";
import { PageHeader } from "./page-header";

export function AccountsView() {
  return (
    <div>
      <PageHeader
        title="Bank accounts & credit cards"
        description="Add and manage personal and Avaken Ltd accounts separately — banks, savers, and credit cards."
      />
      <BankAccountsManager />
    </div>
  );
}
