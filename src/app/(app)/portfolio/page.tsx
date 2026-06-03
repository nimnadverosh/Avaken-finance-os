import type { Metadata } from "next";
import { PortfolioView } from "@/components/pages/portfolio-view";

export const metadata: Metadata = {
  title: "Portfolio · Avaken Finance OS",
};

export default function PortfolioPage() {
  return <PortfolioView />;
}
