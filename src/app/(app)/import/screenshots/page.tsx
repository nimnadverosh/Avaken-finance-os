import { ScreenshotImportFlow } from "@/components/import/screenshot-import-flow";
import { PageHeader } from "@/components/pages/page-header";
import Link from "next/link";
import { Zap } from "lucide-react";

export const metadata = {
  title: "Screenshot Import · Avaken Finance OS",
  description: "Your daily banking screenshot import — fast, secure, multi-bank",
};

export default function ScreenshotImportPage() {
  return (
    <div>
      <PageHeader
        title="Screenshot import"
        description="Drop up to 15 banking screenshots at once · Hermes extracts every transaction · images never stored"
        actions={
          <Link
            href="/transactions"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            View ledger →
          </Link>
        }
      />
      <div className="mb-6 flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/[0.05] px-4 py-2.5 text-xs text-muted-foreground">
        <Zap className="size-3.5 shrink-0 text-primary" />
        <span>
          <strong className="font-medium text-foreground">Fastest daily workflow</strong> — batch
          upload from Starling, RBS, Barclays, Amex, Apple Pay, and more in one pass.
        </span>
      </div>
      <ScreenshotImportFlow />
    </div>
  );
}
