"use client";

import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end",
        className,
      )}
    >
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          <span className="text-gradient">{title}</span>
        </h1>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
