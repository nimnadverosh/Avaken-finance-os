import type { Metadata } from "next";
import { ReportsView } from "@/components/pages/reports-view";

export const metadata: Metadata = {
  title: "Reports · Avaken Finance OS",
};

export default function ReportsPage() {
  return <ReportsView />;
}
