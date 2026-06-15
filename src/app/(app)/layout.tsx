import { AppShell } from "@/components/layout/app-shell";

/** Avoid stale prerendered shells after deploys (prevents chunk mismatch errors). */
export const dynamic = "force-dynamic";

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
