import type { Metadata } from "next";
import { InsightsView } from "@/components/pages/insights-view";

export const metadata: Metadata = {
  title: "AI Insights · Avaken Finance OS",
};

export default function InsightsPage() {
  return <InsightsView />;
}
