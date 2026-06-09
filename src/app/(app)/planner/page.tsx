import type { Metadata } from "next";
import { PlannerView } from "@/components/planner/planner-view";

export const metadata: Metadata = {
  title: "Daily Planner · Avaken Finance OS",
};

export default function PlannerPage() {
  return <PlannerView />;
}
