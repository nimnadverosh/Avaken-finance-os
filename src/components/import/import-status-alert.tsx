"use client";

import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "error" | "success" | "info";

const STYLES: Record<Variant, { border: string; bg: string; text: string; icon: typeof AlertCircle }> = {
  error: {
    border: "border-negative/30",
    bg: "bg-negative/[0.06]",
    text: "text-negative",
    icon: AlertCircle,
  },
  success: {
    border: "border-primary/30",
    bg: "bg-primary/[0.06]",
    text: "text-primary",
    icon: CheckCircle2,
  },
  info: {
    border: "border-border/80",
    bg: "bg-card/60",
    text: "text-muted-foreground",
    icon: Info,
  },
};

export function ImportStatusAlert({
  variant,
  title,
  message,
  onDismiss,
  className,
}: {
  variant: Variant;
  title?: string;
  message: string;
  onDismiss?: () => void;
  className?: string;
}) {
  const style = STYLES[variant];
  const Icon = style.icon;

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3",
        style.border,
        style.bg,
        className,
      )}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", style.text)} />
      <div className="min-w-0 flex-1">
        {title && <p className={cn("text-sm font-semibold", style.text)}>{title}</p>}
        <p className={cn("text-sm", title ? "mt-0.5 text-muted-foreground" : style.text)}>{message}</p>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
