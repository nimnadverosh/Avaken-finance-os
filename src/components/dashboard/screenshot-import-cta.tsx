"use client";

import Link from "next/link";
import { Camera, ChevronRight, Shield, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ScreenshotImportCta({ className }: { className?: string }) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden border-primary/25 bg-gradient-to-br from-primary/[0.1] via-card to-card p-6 sm:p-7",
        className,
      )}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 size-48 rounded-full bg-primary/12 blur-3xl" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
              <Zap className="size-3" />
              Daily import
            </span>
            <span className="text-[10px] text-subtle">Up to 15 screenshots · all banks at once</span>
          </div>
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Drop your banking screenshots — done in seconds
          </h2>
          <p className="text-sm text-muted-foreground">
            Starling, RBS, Barclays, Amex, Apple Pay, Tide, and more. Hermes on your VPS reads every
            screen, you review once, then import all transactions.
          </p>
          <p className="flex items-center gap-1.5 text-[11px] text-subtle">
            <Shield className="size-3 text-primary/70" />
            Ephemeral processing · never stored on Avaken
          </p>
        </div>
        <Link
          href="/import/screenshots"
          className={cn(
            "inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl px-10 py-5 text-lg font-semibold transition-all",
            "bg-primary text-primary-foreground",
            "shadow-[0_0_0_1px_rgba(16,185,129,0.45),0_16px_48px_-12px_rgba(16,185,129,0.6)]",
            "hover:bg-emerald hover:shadow-[0_0_0_1px_rgba(52,211,153,0.5),0_20px_56px_-12px_rgba(16,185,129,0.7)]",
          )}
        >
          <Camera className="size-5" />
          Import screenshots
          <ChevronRight className="size-5" />
        </Link>
      </div>
    </Card>
  );
}
