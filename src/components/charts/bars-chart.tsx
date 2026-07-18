"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompact, formatSigned } from "@/lib/utils";

export interface BarDatum {
  label: string;
  value: number;
  /** Overrides the default sign-based color when present. */
  color?: string;
}

export function BarsChart({
  data,
  height = 240,
  valueFormat = (v) => formatSigned(v),
  yTickFormat = (v) => "€" + formatCompact(v),
}: {
  data: BarDatum[];
  height?: number;
  valueFormat?: (v: number) => string;
  yTickFormat?: (v: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <XAxis
          dataKey="label"
          tick={{ fill: "var(--muted-2)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v: number) => yTickFormat(v)}
          tick={{ fill: "var(--muted-2)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <Tooltip
          cursor={{ fill: "var(--card-hover)" }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const v = payload[0].value as number;
            const color =
              (payload[0].payload as BarDatum)?.color ??
              (v >= 0 ? "var(--profit)" : "var(--loss)");
            return (
              <div className="glass-strong rounded-xl px-3 py-2 shadow-xl">
                <p className="text-xs text-muted">{label}</p>
                <p className="tnum text-sm font-semibold" style={{ color }}>
                  {valueFormat(v)}
                </p>
              </div>
            );
          }}
        />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={44}>
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={d.color ?? (d.value >= 0 ? "var(--profit)" : "var(--loss)")}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
