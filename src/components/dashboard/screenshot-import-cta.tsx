"use client";

import Link from "next/link";
import { Camera, ChevronRight, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ScreenshotImportCta({ className }: { className?: string }) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.08] via-card to-card p-6",
        className,
      )}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-lg space-y-2">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-primary">
            <Camera className="size-3.5" />
            Universal Screenshot Import
          </div>
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
            Turn bank screenshots into ledger entries
          </h2>
          <p className="text-sm text-muted-foreground">
            Drop Stripe, Tide, TikTok, or personal banking screenshots. Hermes on your VPS extracts
            transactions — images deleted instantly.
          </p>
          <p className="flex items-center gap-1.5 text-[11px] text-subtle">
            <Shield className="size-3 text-primary/70" />
            Ephemeral · VPS-only vision · No raw image storage
          </p>
        </div>
        <Link
          href="/import/screenshots"
          className={cn(
            "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-8 py-4 text-base font-semibold transition-all",
            "bg-primary text-primary-foreground",
            "shadow-[0_0_0_1px_rgba(16,185,129,0.4),0_12px_40px_-12px_rgba(16,185,129,0.55)]",
            "hover:bg-emerald hover:shadow-[0_0_0_1px_rgba(52,211,153,0.5),0_16px_48px_-12px_rgba(16,185,129,0.65)]",
          )}
        >
          Upload screenshots
          <ChevronRight className="size-5" />
        </Link>
      </div>
    </Card>
  );
}
