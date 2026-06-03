import type { Metadata } from "next";
import { Dashboard } from "@/components/dashboard/dashboard";

export const metadata: Metadata = {
  title: "Dashboard · Avaken Finance OS",
  description:
    "Consolidated view of Avaken Ltd and personal finances — revenue, VAT, tax reserves and TikTok affiliate performance.",
};

export default function DashboardPage() {
  return <Dashboard />;
}
