"use client";

import { useMemo } from "react";
import {
  Wallet,
  TrendingUp,
  CalendarDays,
  CalendarRange,
  Calendar,
  Percent,
  Gauge,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { useApi, type GrowthResponse, type Operation } from "@/lib/api";
import { MonthlyGoalCard } from "@/components/monthly-goal-card";
import { StatCard, SectionHeading } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CountUp } from "@/components/ui/count-up";
import { PageTransition, PageHeader, Skeleton } from "@/components/ui/page";
import { GrowthChart } from "@/components/charts/growth-chart";
import { BarsChart, type BarDatum } from "@/components/charts/bars-chart";
import { WinLossDonut } from "@/components/charts/donut-chart";
import {
  formatCurrency,
  formatPercent,
  formatSigned,
  formatSignedPercent,
} from "@/lib/utils";

const STATUS_META = {
  above: { label: "Acima da projeção", variant: "profit", dot: "🟢" },
  "on-track": { label: "Dentro da projeção", variant: "warn", dot: "🟡" },
  below: { label: "Abaixo da projeção", variant: "loss", dot: "🔴" },
} as const;

export default function DashboardPage() {
  const { data } = useApi<GrowthResponse>("/api/growth");
  const { data: ops } = useApi<Operation[]>("/api/operations");

  const monthly = useMemo<BarDatum[]>(() => buildMonthly(ops ?? []), [ops]);

  if (!data) return <DashboardSkeleton />;

  const { stats, projection, comparison, nextMilestone, plan } = data;
  const status = STATUS_META[comparison.status];

  return (
    <PageTransition>
      <PageHeader
        title="Olá, Trader 👋"
        subtitle="Aqui está o resumo do desempenho da tua conta em tempo real."
        action={
          <Badge variant={status.variant} className="h-8 px-3 text-sm">
            {status.dot} {status.label} ({formatSignedPercent(comparison.deltaPct)})
          </Badge>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
        <StatCard
          index={0}
          label="Capital Inicial"
          tone="neutral"
          icon={Wallet}
          value={<CountUp value={stats.initialCapital} format={(v) => formatCurrency(v)} />}
          hint={`Início do plano`}
        />
        <StatCard
          index={1}
          label="Capital Atual"
          tone="brand"
          icon={TrendingUp}
          value={<CountUp value={stats.currentCapital} format={(v) => formatCurrency(v)} />}
          delta={{
            text: formatSignedPercent(stats.totalReturnPct),
            positive: stats.totalPnl >= 0,
          }}
          hint="retorno total"
        />
        <StatCard
          index={2}
          label="Resultado Diário"
          tone={stats.dailyPnl >= 0 ? "profit" : "loss"}
          icon={CalendarDays}
          value={
            <span className={stats.dailyPnl >= 0 ? "text-[var(--profit)]" : "text-[var(--loss)]"}>
              <CountUp value={stats.dailyPnl} format={(v) => formatSigned(v)} />
            </span>
          }
        />
        <StatCard
          index={3}
          label="Resultado Semanal"
          tone={stats.weeklyPnl >= 0 ? "profit" : "loss"}
          icon={CalendarRange}
          value={
            <span className={stats.weeklyPnl >= 0 ? "text-[var(--profit)]" : "text-[var(--loss)]"}>
              <CountUp value={stats.weeklyPnl} format={(v) => formatSigned(v)} />
            </span>
          }
        />
        <StatCard
          index={4}
          label="Resultado Mensal"
          tone={stats.monthlyPnl >= 0 ? "profit" : "loss"}
          icon={Calendar}
          value={
            <span className={stats.monthlyPnl >= 0 ? "text-[var(--profit)]" : "text-[var(--loss)]"}>
              <CountUp value={stats.monthlyPnl} format={(v) => formatSigned(v)} />
            </span>
          }
        />
        <StatCard
          index={5}
          label="Win Rate"
          tone="info"
          icon={Percent}
          value={<CountUp value={stats.winRate} format={(v) => formatPercent(v)} />}
          hint={`${stats.wins}V / ${stats.losses}D`}
        />
        <StatCard
          index={6}
          label="Profit Factor"
          tone="brand"
          icon={Gauge}
          value={<CountUp value={stats.profitFactor} format={(v) => v.toFixed(2)} />}
          delta={{
            text: stats.profitFactor >= 1.5 ? "Excelente" : stats.profitFactor >= 1 ? "Lucrativo" : "A melhorar",
            positive: stats.profitFactor >= 1,
          }}
        />
        <StatCard
          index={7}
          label="Total de Operações"
          tone="neutral"
          icon={CalendarDays}
          value={<CountUp value={stats.totalTrades} format={(v) => Math.round(v).toString()} />}
          hint={`melhor ${formatSigned(stats.bestTrade)}`}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between p-5 pb-0">
            <SectionHeading
              title="Evolução da Banca"
              subtitle="Real vs. projeção do plano de crescimento"
            />
            <div className="flex items-center gap-3 text-xs">
              <LegendDot color="var(--profit)" label="Real" />
              <LegendDot color="var(--brand)" label="Projetado" />
            </div>
          </div>
          <div className="p-3 pt-2 sm:p-4">
            <GrowthChart
              points={projection.points.slice(0, comparison.week + 6)}
              target={plan.targetCapital}
              height={320}
            />
          </div>
        </Card>

        <Card>
          <div className="p-5">
            <SectionHeading title="Distribuição" subtitle="Trades ganhos vs. perdidos" />
            <WinLossDonut wins={stats.wins} losses={stats.losses} />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <MiniStat label="Média ganho" value={formatSigned(stats.avgWin)} tone="profit" />
              <MiniStat label="Média perda" value={formatSigned(stats.avgLoss)} tone="loss" />
              <MiniStat label="Melhor trade" value={formatSigned(stats.bestTrade)} tone="profit" />
              <MiniStat label="Pior trade" value={formatSigned(stats.worstTrade)} tone="loss" />
            </div>
          </div>
        </Card>
      </div>

      {/* Monthly + Next milestone + Monthly goal */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Card className="lg:col-span-2">
          <div className="p-5">
            <SectionHeading title="Resultados Mensais" subtitle="P&L líquido por mês" />
            {monthly.length ? (
              <BarsChart data={monthly} />
            ) : (
              <p className="py-10 text-center text-sm text-muted">Sem dados suficientes.</p>
            )}
          </div>
        </Card>

        <MonthlyGoalCard data={data.monthlyGoal} />

        <Card className="relative overflow-hidden">
          <div className="p-5">
            <SectionHeading title="Próxima Meta" />
            {nextMilestone ? (
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-3xl font-semibold tracking-tight">
                    {nextMilestone.label}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    Faltam{" "}
                    <span className="font-semibold text-[var(--brand)]">
                      {formatCurrency(nextMilestone.remaining)}
                    </span>{" "}
                    para atingir esta meta.
                  </p>
                </div>
                <Progress value={nextMilestone.progress} />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">
                    {formatPercent(nextMilestone.progress * 100, 0)} concluído
                  </span>
                  {nextMilestone.weeksAway != null && (
                    <Badge variant="brand">
                      ~{nextMilestone.weeksAway} semanas
                    </Badge>
                  )}
                </div>
                <p className="rounded-xl bg-[var(--card-hover)] p-3 text-xs leading-relaxed text-muted">
                  Mantendo o desempenho atual, chegarás à meta em cerca de{" "}
                  <span className="font-semibold text-foreground">
                    {nextMilestone.weeksAway ?? "—"} semanas
                  </span>
                  .
                </p>
              </div>
            ) : (
              <p className="py-6 text-sm text-muted">
                🎉 Todas as metas atingidas! Define novas em Metas.
              </p>
            )}
          </div>
        </Card>
      </div>
    </PageTransition>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-muted">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "profit" | "loss";
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
      <p className="text-xs text-muted-2">{label}</p>
      <p
        className="tnum mt-0.5 flex items-center gap-1 text-sm font-semibold"
        style={{ color: tone === "profit" ? "var(--profit)" : "var(--loss)" }}
      >
        {tone === "profit" ? (
          <ArrowUpRight className="h-3.5 w-3.5" />
        ) : (
          <ArrowDownRight className="h-3.5 w-3.5" />
        )}
        {value}
      </p>
    </div>
  );
}

function buildMonthly(ops: Operation[]): BarDatum[] {
  const map = new Map<string, number>();
  for (const op of ops) {
    const d = new Date(op.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    map.set(key, (map.get(key) ?? 0) + op.pnl);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([key, value]) => {
      const [y, m] = key.split("-");
      const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(
        "pt-PT",
        { month: "short" },
      );
      return { label, value: Math.round(value) };
    });
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-96 lg:col-span-2" />
        <Skeleton className="h-96" />
      </div>
    </div>
  );
}
