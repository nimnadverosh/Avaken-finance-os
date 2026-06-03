"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { CategorySlice } from "@/lib/data/types";
import { ChartTooltip } from "./chart-tooltip";
import { formatCurrency } from "@/lib/format";

export function ExpenseDonut({ data }: { data: CategorySlice[] }) {
  const total = data.reduce((a, b) => a + b.value, 0);

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative h-[180px] w-[180px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={62}
              outerRadius={86}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((slice) => (
                <Cell key={slice.name} fill={slice.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] uppercase tracking-wide text-subtle">Total</span>
          <span className="tabular text-lg font-semibold">
            {formatCurrency(total, { compact: true })}
          </span>
        </div>
      </div>

      <div className="grid w-full grid-cols-1 gap-2">
        {data.map((slice) => (
          <div key={slice.name} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className="size-2.5 rounded-sm" style={{ background: slice.color }} />
              {slice.name}
            </span>
            <span className="tabular font-medium">{formatCurrency(slice.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
