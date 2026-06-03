import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium tabular",
  {
    variants: {
      tone: {
        positive: "bg-positive/12 text-positive ring-1 ring-positive/20",
        negative: "bg-negative/12 text-negative ring-1 ring-negative/20",
        warning: "bg-warning/12 text-warning ring-1 ring-warning/20",
        info: "bg-info/12 text-info ring-1 ring-info/20",
        neutral: "bg-white/[0.05] text-muted-foreground ring-1 ring-white/10",
        violet: "bg-violet/12 text-violet ring-1 ring-violet/20",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

function Badge({
  className,
  tone,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone, className }))} {...props} />;
}

export { Badge, badgeVariants };
