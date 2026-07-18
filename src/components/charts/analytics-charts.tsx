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
import type { EquityPoint } from "@/lib/analytics";
import { formatCompact, formatCurrency, formatDate, formatPercent } from "@/lib/utils";

const xAxis = (
  <XAxis
    dataKey="date"
    tickFormatter={(d: string) =>
      new Date(d).toLocaleDateString("pt-PT", { day: "2-digit", month: "short" })
    }
    tick={{ fill: "var(--muted-2)", fontSize: 11 }}
    axisLine={false}
    tickLine={false}
    minTickGap={32}
  />
);

export function EquityChart({
  data,
  height = 260,
}: {
  data: EquityPoint[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        {xAxis}
        <YAxis
          tickFormatter={(v: number) => "€" + formatCompact(v)}
          tick={{ fill: "var(--muted-2)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={56}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as EquityPoint;
            return (
              <div className="glass-strong rounded-xl px-3 py-2 shadow-xl">
                <p className="mb-1 text-xs text-muted">{label ? formatDate(String(label)) : ""}</p>
                <p className="tnum text-sm font-semibold">{formatCurrency(p.balance, true)}</p>
                {p.drawdownPct < 0 && (
                  <p className="tnum text-xs text-[var(--loss)]">
                    DD {formatPercent(p.drawdownPct, 1)}
                  </p>
                )}
              </div>
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="balance"
          stroke="var(--brand)"
          strokeWidth={2}
          fill="url(#eqFill)"
          dot={false}
          activeDot={{ r: 4, fill: "var(--brand)" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Underwater drawdown: negative area from 0 down to the current drawdown %. */
export function DrawdownChart({
  data,
  height = 200,
}: {
  data: EquityPoint[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="ddFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--loss)" stopOpacity={0} />
            <stop offset="100%" stopColor="var(--loss)" stopOpacity={0.4} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        {xAxis}
        <YAxis
          tickFormatter={(v: number) => `${v}%`}
          tick={{ fill: "var(--muted-2)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={44}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const v = payload[0].value as number;
            return (
              <div className="glass-strong rounded-xl px-3 py-2 shadow-xl">
                <p className="text-xs text-muted">{label ? formatDate(String(label)) : ""}</p>
                <p className="tnum text-sm font-semibold text-[var(--loss)]">
                  {formatPercent(v, 1)}
                </p>
              </div>
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="drawdownPct"
          stroke="var(--loss)"
          strokeWidth={1.5}
          fill="url(#ddFill)"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
