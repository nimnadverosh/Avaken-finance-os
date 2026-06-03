"use client";

import { Building2, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScreenshotSourceView } from "@/lib/screenshots/build-sources";

export function ScreenshotSourcesGrid({
  sources,
  className,
}: {
  sources: ScreenshotSourceView[];
  className?: string;
}) {
  if (sources.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold tracking-tight">Screenshots analysed</h3>
        <span className="text-[11px] text-subtle">
          {sources.length} image{sources.length === 1 ? "" : "s"} · banks auto-detected
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {sources.map((src) => (
          <div
            key={src.index}
            className="overflow-hidden rounded-xl border border-border/80 bg-card/60"
          >
            <div className="relative aspect-[4/3] bg-surface/80">
              {src.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src.previewUrl}
                  alt={src.fileName ?? `Screenshot ${src.index + 1}`}
                  className="size-full object-cover object-top opacity-90"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-subtle">
                  <ImageIcon className="size-8 opacity-40" />
                </div>
              )}
              <span
                className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md border border-white/10 bg-background/80 px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm"
                style={{ color: src.bankAccent }}
              >
                <Building2 className="size-3" />
                {src.bank}
              </span>
            </div>
            <div className="border-t border-border/60 px-2.5 py-2">
              <p className="truncate text-[10px] text-subtle">
                {src.fileName ?? `Screenshot ${src.index + 1}`}
              </p>
              <p className="text-[11px] font-medium text-foreground">
                {src.transactionCount} transaction{src.transactionCount === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
