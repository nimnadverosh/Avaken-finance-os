import type { Metadata } from "next";
import { VatView } from "@/components/pages/vat-view";

export const metadata: Metadata = {
  title: "VAT · Avaken Finance OS",
};

export default function VatPage() {
  return <VatView />;
}
