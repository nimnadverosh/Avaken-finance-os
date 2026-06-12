"use client";

import { FileSpreadsheet, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Parsing/aggregation loading state, styled to match the screenshot import flow. */
export function TikTokLoadingState({ fileName }: { fileName?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-primary/20 bg-card p-10",
        "shadow-[0_0_60px_-20px_rgba(16,185,129,0.35)]",
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(16,185,129,0.12),transparent_60%)]" />
      <div className="relative flex flex-col items-center text-center">
        <div className="relative mb-6">
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <span className="relative flex size-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10">
            <FileSpreadsheet className="size-7 text-primary" />
          </span>
        </div>
        <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Loader2 className="size-4 animate-spin text-primary" />
          Reading your TikTok report…
        </h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {fileName ? `Parsing ${fileName}` : "Parsing the workbook"} — aggregating commission,
          orders and the company / personal split. This stays entirely in your browser.
        </p>
        <div className="mt-8 h-1 w-48 overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full w-1/3 animate-[shimmer_1.4s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-transparent via-primary to-transparent" />
        </div>
      </div>
    </div>
  );
}
