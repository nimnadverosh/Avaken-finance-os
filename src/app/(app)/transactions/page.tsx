import type { Metadata } from "next";
import { TransactionsView } from "@/components/pages/transactions-view";

export const metadata: Metadata = {
  title: "Transactions · Avaken Finance OS",
};

export default function TransactionsPage() {
  return <TransactionsView />;
}
