"use client";

import { ArrowDownToLine, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function ImportAllButton({
  count,
  loading,
  disabled,
  onClick,
  className,
}: {
  count: number;
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading || count === 0}
      className={cn(
        "flex w-full items-center justify-center gap-3 rounded-2xl py-5 text-lg font-semibold transition-all",
        "bg-primary text-primary-foreground",
        "shadow-[0_0_0_1px_rgba(16,185,129,0.45),0_16px_48px_-12px_rgba(16,185,129,0.6)]",
        "hover:bg-emerald hover:shadow-[0_0_0_1px_rgba(52,211,153,0.5),0_20px_56px_-12px_rgba(16,185,129,0.7)]",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
    >
      {loading ? (
        <>
          <Loader2 className="size-5 animate-spin" />
          Importing…
        </>
      ) : (
        <>
          <ArrowDownToLine className="size-5 shrink-0" />
          <span>
            Import All
            {count > 0 && (
              <span className="ml-2 text-base font-normal opacity-90">
                · {count} transaction{count === 1 ? "" : "s"}
              </span>
            )}
          </span>
        </>
      )}
    </button>
  );
}
