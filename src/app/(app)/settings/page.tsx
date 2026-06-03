import type { Metadata } from "next";
import { SettingsView } from "@/components/pages/settings-view";

export const metadata: Metadata = {
  title: "Settings · Avaken Finance OS",
};

export default function SettingsPage() {
  return <SettingsView />;
}
