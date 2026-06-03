"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SeriesPoint } from "@/lib/data/types";
import { ChartTooltip } from "./chart-tooltip";
import { formatCurrency } from "@/lib/format";

export function CashflowChart({ data }: { data: SeriesPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: -8, bottom: 0 }} barGap={-14}>
        <CartesianGrid vertical={false} stroke="#1b1f2a" strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "#5e636f", fontSize: 11 }}
          dy={8}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: "#5e636f", fontSize: 11 }}
          tickFormatter={(v) => formatCurrency(Number(v), { compact: true })}
          width={56}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <Bar dataKey="inflow" name="Inflow" radius={[4, 4, 0, 0]} barSize={14}>
          {data.map((_, i) => (
            <Cell key={i} fill="#10b981" />
          ))}
        </Bar>
        <Bar dataKey="outflow" name="Outflow" radius={[4, 4, 0, 0]} barSize={14}>
          {data.map((_, i) => (
            <Cell key={i} fill="#f43f5e" fillOpacity={0.7} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
