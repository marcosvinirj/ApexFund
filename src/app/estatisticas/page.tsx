"use client";

import {
  Target,
  Gauge,
  TrendingDown,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { useApi } from "@/lib/api";
import type { AnalyticsResult, GroupStat } from "@/lib/analytics";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StatCard, SectionHeading } from "@/components/ui/stat-card";
import { CountUp } from "@/components/ui/count-up";
import { PageTransition, PageHeader, Skeleton } from "@/components/ui/page";
import { BarsChart } from "@/components/charts/bars-chart";
import { EquityChart, DrawdownChart } from "@/components/charts/analytics-charts";
import { formatPercent, formatSigned, cn } from "@/lib/utils";

export default function EstatisticasPage() {
  const { data } = useApi<AnalyticsResult>("/api/analytics");

  if (!data) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  const { summary, equity, rDistribution, byPair, byDirection, byWeekday, streaks } =
    data;

  return (
    <PageTransition>
      <PageHeader
        title="Estatísticas"
        subtitle="Análise profunda do teu desempenho e edge estatístico."
      />

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <StatCard
          index={0}
          label="Expectativa"
          tone="brand"
          icon={Target}
          value={
            <span style={{ color: summary.expectancyR >= 0 ? "var(--profit)" : "var(--loss)" }}>
              <CountUp value={summary.expectancyR} format={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}R`} />
            </span>
          }
          hint="por operação"
        />
        <StatCard
          index={1}
          label="Profit Factor"
          tone="info"
          icon={Gauge}
          value={<CountUp value={summary.profitFactor} format={(v) => v.toFixed(2)} />}
          hint={`${summary.totalR >= 0 ? "+" : ""}${summary.totalR.toFixed(1)}R total`}
        />
        <StatCard
          index={2}
          label="Max Drawdown"
          tone="loss"
          icon={TrendingDown}
          value={
            <span className="text-[var(--loss)]">
              <CountUp value={summary.maxDrawdownPct} format={(v) => formatPercent(v, 1)} />
            </span>
          }
          hint={`${summary.maxDrawdownDurationDays}d · ${summary.recovered ? "recuperado" : "em curso"}`}
        />
        <StatCard
          index={3}
          label="Melhor sequência"
          tone="profit"
          icon={Flame}
          value={<CountUp value={streaks.longestWin} format={(v) => `${Math.round(v)}`} />}
          delta={{
            text: `${streaks.longestLoss} perdas seguidas`,
            positive: false,
          }}
        />
      </div>

      {/* Equity + Drawdown */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="p-5">
            <SectionHeading title="Curva de Capital" subtitle="Evolução real do saldo" />
            <EquityChart data={equity} height={280} />
          </div>
        </Card>
        <Card>
          <div className="p-5">
            <SectionHeading title="Drawdown" subtitle="Distância ao topo (underwater)" />
            <DrawdownChart data={equity} height={220} />
            <div className="mt-3 flex items-center justify-between rounded-xl bg-[var(--card-hover)] p-3 text-sm">
              <span className="text-muted">Drawdown atual</span>
              <span
                className="tnum font-semibold"
                style={{ color: summary.currentDrawdownPct < 0 ? "var(--loss)" : "var(--profit)" }}
              >
                {formatPercent(summary.currentDrawdownPct, 1)}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* R distribution + weekday */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="p-5">
            <SectionHeading title="Distribuição de R" subtitle="Frequência por R-múltiplo obtido" />
            <BarsChart
              data={rDistribution}
              valueFormat={(v) => `${Math.round(v)} trades`}
              yTickFormat={(v) => String(Math.round(v))}
            />
          </div>
        </Card>
        <Card>
          <div className="p-5">
            <SectionHeading title="Resultado por Dia da Semana" subtitle="P&L líquido acumulado" />
            <BarsChart data={byWeekday} />
          </div>
        </Card>
      </div>

      {/* By direction */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {byDirection.map((g) => (
          <DirectionCard key={g.key} g={g} />
        ))}
      </div>

      {/* By pair */}
      <Card className="overflow-hidden">
        <div className="p-5 pb-2">
          <SectionHeading title="Desempenho por Par" subtitle="Onde tens verdadeira vantagem" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-muted-2">
                <th className="px-5 py-3 font-medium">Par</th>
                <th className="px-5 py-3 text-right font-medium">Trades</th>
                <th className="px-5 py-3 text-right font-medium">Win Rate</th>
                <th className="px-5 py-3 text-right font-medium">Avg R</th>
                <th className="px-5 py-3 text-right font-medium">Profit Factor</th>
                <th className="px-5 py-3 text-right font-medium">P&L</th>
              </tr>
            </thead>
            <tbody>
              {byPair.map((g) => (
                <tr
                  key={g.key}
                  className="border-b border-[var(--border)] transition-colors last:border-0 hover:bg-[var(--card)]"
                >
                  <td className="px-5 py-3 font-medium">{g.key}</td>
                  <td className="tnum px-5 py-3 text-right text-muted">{g.trades}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <span className="tnum w-10 text-right">{formatPercent(g.winRate, 0)}</span>
                      <div className="w-16">
                        <Progress value={g.winRate / 100} />
                      </div>
                    </div>
                  </td>
                  <td className="tnum px-5 py-3 text-right">{g.avgR >= 0 ? "+" : ""}{g.avgR.toFixed(2)}R</td>
                  <td className="tnum px-5 py-3 text-right text-muted">{g.profitFactor.toFixed(2)}</td>
                  <td
                    className="tnum px-5 py-3 text-right font-semibold"
                    style={{ color: g.pnl >= 0 ? "var(--profit)" : "var(--loss)" }}
                  >
                    {formatSigned(g.pnl)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </PageTransition>
  );
}

function DirectionCard({ g }: { g: GroupStat }) {
  const isLong = g.key === "Long";
  return (
    <Card>
      <div className="flex items-center gap-4 p-5">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-2xl",
            isLong
              ? "bg-[var(--profit-soft)] text-[var(--profit)]"
              : "bg-[var(--loss-soft)] text-[var(--loss)]",
          )}
        >
          {isLong ? <ArrowUpRight className="h-6 w-6" /> : <ArrowDownRight className="h-6 w-6" />}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold">{g.key}</p>
            <Badge variant="neutral" className="px-1.5 py-0.5">
              {g.trades} trades
            </Badge>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
            <MetaFig label="Win rate" value={formatPercent(g.winRate, 0)} />
            <MetaFig label="Avg R" value={`${g.avgR >= 0 ? "+" : ""}${g.avgR.toFixed(2)}R`} />
            <MetaFig
              label="P&L"
              value={formatSigned(g.pnl)}
              color={g.pnl >= 0 ? "var(--profit)" : "var(--loss)"}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}

function MetaFig({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-2">{label}</p>
      <p className="tnum text-sm font-semibold" style={{ color }}>
        {value}
      </p>
    </div>
  );
}
