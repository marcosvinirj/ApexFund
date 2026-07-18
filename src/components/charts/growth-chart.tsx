"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ProjectionPoint } from "@/lib/types";
import { formatCompact, formatCurrency, formatDate } from "@/lib/utils";

export function GrowthChart({
  points,
  target,
  height = 340,
  showReal = true,
}: {
  points: ProjectionPoint[];
  target?: number;
  height?: number;
  showReal?: boolean;
}) {
  const hasReal =
    showReal && points.some((p) => p.real != null && p.real !== undefined);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart
        data={points}
        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="fillProjected" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="fillReal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--profit)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--profit)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tickFormatter={(d: string) =>
            new Date(d).toLocaleDateString("pt-PT", {
              day: "2-digit",
              month: "short",
            })
          }
          tick={{ fill: "var(--muted-2)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          minTickGap={32}
        />
        <YAxis
          tickFormatter={(v: number) => "€" + formatCompact(v)}
          tick={{ fill: "var(--muted-2)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={56}
        />
        {target && (
          <ReferenceLine
            y={target}
            stroke="var(--brand-2)"
            strokeDasharray="6 4"
            strokeOpacity={0.7}
            label={{
              value: "Meta",
              position: "insideTopRight",
              fill: "var(--brand-2)",
              fontSize: 11,
            }}
          />
        )}
        <Tooltip content={<GrowthTooltip />} />
        <Area
          type="monotone"
          dataKey="projected"
          name="Projetado"
          stroke="var(--brand)"
          strokeWidth={2}
          fill="url(#fillProjected)"
          dot={false}
          activeDot={{ r: 4, fill: "var(--brand)" }}
        />
        {hasReal && (
          <Area
            type="monotone"
            dataKey="real"
            name="Real"
            stroke="var(--profit)"
            strokeWidth={2.5}
            fill="url(#fillReal)"
            connectNulls
            dot={false}
            activeDot={{ r: 4, fill: "var(--profit)" }}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface TooltipEntry {
  name: string;
  value: number;
  color: string;
}

function GrowthTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-xl px-3 py-2 shadow-xl">
      <p className="mb-1.5 text-xs font-medium text-muted">
        {label ? formatDate(label) : ""}
      </p>
      <div className="flex flex-col gap-1">
        {payload.map((e) => (
          <div key={e.name} className="flex items-center gap-2 text-sm">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: e.color }}
            />
            <span className="text-muted">{e.name}</span>
            <span className="tnum ml-auto font-semibold">
              {formatCurrency(e.value, true)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
