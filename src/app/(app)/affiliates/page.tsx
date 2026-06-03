import type { Metadata } from "next";
import { AffiliatesView } from "@/components/pages/affiliates-view";

export const metadata: Metadata = {
  title: "Affiliates · Avaken Finance OS",
};

export default function AffiliatesPage() {
  return <AffiliatesView />;
}
