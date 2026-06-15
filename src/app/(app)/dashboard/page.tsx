import type { Metadata } from "next";
import { Dashboard } from "@/components/dashboard/dashboard";

/** Avoid serving a stale pre-rendered dashboard after deploys. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard · Avaken Finance OS",
  description:
    "Consolidated view of Avaken Ltd and personal finances — revenue, VAT, tax reserves and TikTok affiliate performance.",
};

export default function DashboardPage() {
  return <Dashboard />;
}
