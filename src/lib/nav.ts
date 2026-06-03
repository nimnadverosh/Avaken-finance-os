import {
  ArrowLeftRight,
  Camera,
  CreditCard,
  FileJson,
  FileBarChart2,
  LayoutDashboard,
  Landmark,
  LineChart,
  Music2,
  Percent,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  group: "Overview" | "Avaken" | "Wealth" | "Reporting";
}

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, group: "Overview" },
  { label: "Screenshot import", href: "/import/screenshots", icon: Camera, badge: "Daily", group: "Overview" },
  { label: "Transactions", href: "/transactions", icon: ArrowLeftRight, group: "Overview" },
  { label: "JSON import", href: "/import/json", icon: FileJson, group: "Overview" },
  { label: "Subscriptions", href: "/subscriptions", icon: CreditCard, badge: "19", group: "Overview" },

  { label: "Affiliates", href: "/affiliates", icon: Music2, group: "Avaken" },
  { label: "VAT", href: "/vat", icon: Percent, badge: "Q4", group: "Avaken" },
  { label: "Tax", href: "/tax", icon: Landmark, group: "Avaken" },

  { label: "Portfolio", href: "/portfolio", icon: LineChart, group: "Wealth" },

  { label: "Reports", href: "/reports", icon: FileBarChart2, group: "Reporting" },
  { label: "AI Insights", href: "/insights", icon: Sparkles, badge: "5", group: "Reporting" },
];

export const navGroups = ["Overview", "Avaken", "Wealth", "Reporting"] as const;
