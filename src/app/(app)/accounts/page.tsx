import type { Metadata } from "next";
import { AccountsView } from "@/components/pages/accounts-view";

export const metadata: Metadata = {
  title: "Bank accounts · Avaken Finance OS",
};

export default function AccountsPage() {
  return <AccountsView />;
}
