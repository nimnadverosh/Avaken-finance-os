import {
  ArrowLeftRight,
  CalendarCheck,
  CreditCard,
  FileBarChart2,
  LayoutDashboard,
  Landmark,
  LineChart,
  Music2,
  Percent,
  ShieldCheck,
  Sparkles,
  Upload,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  group: "Overview" | "Plan" | "Avaken" | "Wealth" | "Reporting";
}

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, group: "Overview" },
  { label: "Transactions", href: "/transactions", icon: ArrowLeftRight, group: "Overview" },
  { label: "Subscriptions", href: "/subscriptions", icon: CreditCard, badge: "19", group: "Overview" },

  { label: "Daily Planner", href: "/planner", icon: CalendarCheck, group: "Plan" },

  { label: "Affiliates", href: "/affiliates", icon: Music2, group: "Avaken" },
  { label: "TikTok Upload", href: "/import/tiktok", icon: Upload, badge: "new", group: "Avaken" },
  { label: "Reserves", href: "/tax-clarity", icon: ShieldCheck, group: "Avaken" },
  { label: "VAT Return", href: "/vat", icon: Percent, badge: "Q4", group: "Avaken" },
  { label: "Year Plan", href: "/tax", icon: Landmark, group: "Avaken" },
  { label: "Home Preview", href: "/tax-home-preview", icon: LayoutDashboard, badge: "new", group: "Avaken" },

  { label: "Portfolio", href: "/portfolio", icon: LineChart, group: "Wealth" },

  { label: "Reports", href: "/reports", icon: FileBarChart2, group: "Reporting" },
  { label: "AI Insights", href: "/insights", icon: Sparkles, badge: "5", group: "Reporting" },
];

export const navGroups = ["Overview", "Plan", "Avaken", "Wealth", "Reporting"] as const;

/** Advanced import tools — linked from Settings, not the main sidebar. */
export const advancedImportLinks = [
  {
    label: "TikTok monthly upload",
    href: "/import/tiktok",
    description: "Parse a TikTok Shop earnings .xlsx and refresh the dashboard",
  },
  {
    label: "Screenshot import",
    href: "/import/screenshots",
    description: "Hermes vision extraction from banking screenshots",
  },
  {
    label: "JSON import",
    href: "/import/json",
    description: "Paste or POST Hermes analyze JSON for bulk imports",
  },
] as const;
