"use client";

import { Building2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SplitConfig } from "@/lib/tiktok/types";

const PRESETS = [50, 60, 67, 75, 80];

/**
 * Company (Avaken Ltd) vs personal revenue-share control.
 * `companyPct` is an integer 0–100; personal is the remainder.
 */
export function SplitControl({
  split,
  onChange,
  disabled,
}: {
  split: SplitConfig;
  onChange: (companyFraction: number) => void;
  disabled?: boolean;
}) {
  const companyPct = Math.round(split.company * 100);
  const personalPct = 100 - companyPct;

  return (
    <div className="rounded-2xl border border-border/70 bg-white/[0.015] p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Company / personal split</h3>
          <p className="mt-0.5 text-[11px] text-subtle">
            How this month&apos;s commission is attributed for tax & reporting
          </p>
        </div>
        <div className="flex gap-1">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              disabled={disabled}
              onClick={() => onChange(p / 100)}
              className={cn(
                "rounded-md px-2 py-1 text-[11px] font-medium tabular transition-colors",
                companyPct === p
                  ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                  : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
                disabled && "pointer-events-none opacity-50",
              )}
            >
              {p}%
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Side icon={Building2} label="Avaken Ltd" pct={companyPct} accent="#10b981" />
        <Side icon={User} label="Personal" pct={personalPct} accent="#38bdf8" align="right" />
      </div>

      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={companyPct}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        aria-label="Company revenue share percentage"
        className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/[0.06] accent-primary disabled:opacity-50"
      />

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-info/30">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-emerald transition-all"
          style={{ width: `${companyPct}%` }}
        />
      </div>
    </div>
  );
}

function Side({
  icon: Icon,
  label,
  pct,
  accent,
  align,
}: {
  icon: typeof Building2;
  label: string;
  pct: number;
  accent: string;
  align?: "right";
}) {
  return (
    <div className={cn("flex items-center gap-2", align === "right" && "justify-end text-right")}>
      {align !== "right" && (
        <span className="grid size-8 place-items-center rounded-lg" style={{ background: `${accent}22`, color: accent }}>
          <Icon className="size-4" />
        </span>
      )}
      <div>
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="tabular text-lg font-semibold" style={{ color: accent }}>
          {pct}%
        </p>
      </div>
      {align === "right" && (
        <span className="grid size-8 place-items-center rounded-lg" style={{ background: `${accent}22`, color: accent }}>
          <Icon className="size-4" />
        </span>
      )}
    </div>
  );
}
