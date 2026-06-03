"use client";

import { Shield, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function HermesLoadingState({ imageCount }: { imageCount: number }) {
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
            <Sparkles className="size-7 text-primary animate-pulse" />
          </span>
        </div>
        <h3 className="text-lg font-semibold tracking-tight">
          Reading {imageCount} screenshot{imageCount === 1 ? "" : "s"}…
        </h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Hermes is extracting every transaction and detecting each bank. Usually takes a few
          seconds — images are deleted right after analysis.
        </p>
        <div className="mt-6 flex items-center gap-2 rounded-full border border-border/80 bg-surface/80 px-4 py-2 text-xs text-muted-foreground">
          <Shield className="size-3.5 text-primary" />
          End-to-end ephemeral processing
        </div>
        <div className="mt-8 h-1 w-48 overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full w-1/3 animate-[shimmer_1.4s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-transparent via-primary to-transparent" />
        </div>
      </div>
    </div>
  );
}
