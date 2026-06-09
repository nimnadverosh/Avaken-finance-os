import type { Metadata } from "next";
import { TaxClarityView } from "@/components/pages/tax-clarity-view";

export const metadata: Metadata = {
  title: "Tax Clarity · Avaken Finance OS",
};

export default function TaxClarityPage() {
  return <TaxClarityView />;
}
