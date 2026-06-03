import type { Metadata } from "next";
import { TaxView } from "@/components/pages/tax-view";

export const metadata: Metadata = {
  title: "Tax · Avaken Finance OS",
};

export default function TaxPage() {
  return <TaxView />;
}
