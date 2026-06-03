"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChartTooltip } from "./chart-tooltip";
import { formatCurrency } from "@/lib/format";

export interface Slice {
  name: string;
  value: number;
  color: string;
}

export function AllocationDonut({ data, label }: { data: Slice[]; label?: string }) {
  const total = data.reduce((a, b) => a + b.value, 0);

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative h-[200px] w-[200px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={70}
              outerRadius={95}
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
          <span className="text-[10px] uppercase tracking-wide text-subtle">{label ?? "Total"}</span>
          <span className="tabular text-xl font-semibold">{formatCurrency(total, { compact: true })}</span>
        </div>
      </div>

      <div className="grid w-full grid-cols-1 gap-2">
        {data.map((slice) => (
          <div key={slice.name} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className="size-2.5 rounded-sm" style={{ background: slice.color }} />
              {slice.name}
            </span>
            <span className="tabular font-medium">
              {formatCurrency(slice.value)}{" "}
              <span className="text-subtle">· {((slice.value / total) * 100).toFixed(1)}%</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
