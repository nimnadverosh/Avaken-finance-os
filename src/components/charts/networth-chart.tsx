"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SeriesPoint } from "@/lib/data/types";
import type { Entity } from "@/lib/data/types";
import { ChartTooltip } from "./chart-tooltip";
import { formatCurrency } from "@/lib/format";

export function NetWorthChart({ data, entity }: { data: SeriesPoint[]; entity: Entity }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="nwPersonal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.32} />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="nwAvaken" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.32} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
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
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#272c3a" }} />

        {(entity === "personal" || entity === "consolidated") && (
          <Area
            type="monotone"
            dataKey="personal"
            name="Personal"
            stroke="#38bdf8"
            strokeWidth={2}
            fill="url(#nwPersonal)"
            stackId={entity === "consolidated" ? "nw" : undefined}
          />
        )}
        {(entity === "avaken" || entity === "consolidated") && (
          <Area
            type="monotone"
            dataKey="avaken"
            name="Avaken"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#nwAvaken)"
            stackId={entity === "consolidated" ? "nw" : undefined}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}
