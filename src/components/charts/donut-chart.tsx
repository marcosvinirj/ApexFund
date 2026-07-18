"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { formatPercent } from "@/lib/utils";

export function WinLossDonut({
  wins,
  losses,
  height = 200,
}: {
  wins: number;
  losses: number;
  height?: number;
}) {
  const total = wins + losses;
  const winRate = total ? (wins / total) * 100 : 0;
  const data = [
    { name: "Ganhos", value: wins, color: "var(--profit)" },
    { name: "Perdas", value: losses, color: "var(--loss)" },
  ];

  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius="68%"
            outerRadius="100%"
            paddingAngle={2}
            startAngle={90}
            endAngle={-270}
            stroke="none"
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="tnum text-2xl font-semibold">
          {formatPercent(winRate, 0)}
        </span>
        <span className="text-xs text-muted">Win rate</span>
      </div>
    </div>
  );
}
