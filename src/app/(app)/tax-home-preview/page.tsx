import type { Metadata } from "next";
import { TaxHomePreviewView } from "@/components/pages/tax-home-preview-view";

export const metadata: Metadata = {
  title: "Tax Home Preview · Avaken Finance OS",
};

export default function TaxHomePreviewPage() {
  return <TaxHomePreviewView />;
}
