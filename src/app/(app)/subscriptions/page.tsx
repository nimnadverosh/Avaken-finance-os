import type { Metadata } from "next";
import { SubscriptionsView } from "@/components/pages/subscriptions-view";

export const metadata: Metadata = {
  title: "Subscriptions · Avaken Finance OS",
};

export default function SubscriptionsPage() {
  return <SubscriptionsView />;
}
