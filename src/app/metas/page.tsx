"use client";

import { useMemo } from "react";
import {
  CalendarRange,
  ShieldCheck,
  Flame,
  Trophy,
  Rocket,
  Crosshair,
  Gauge,
  Medal,
  Target as TargetIcon,
  Award,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import { useApi, type GrowthResponse, type Operation } from "@/lib/api";
import type { AnalyticsResult } from "@/lib/analytics";
import { MonthlyGoalCard } from "@/components/monthly-goal-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StatCard, SectionHeading } from "@/components/ui/stat-card";
import { PageTransition, PageHeader, Skeleton } from "@/components/ui/page";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface Achievement {
  title: string;
  desc: string;
  icon: LucideIcon;
  unlocked: boolean;
}

export default function MetasPage() {
  const { data: growth } = useApi<GrowthResponse>("/api/growth");
  const { data: ops } = useApi<Operation[]>("/api/operations");
  const { data: analytics } = useApi<AnalyticsResult>("/api/analytics");

  const habits = useMemo(() => {
    if (!growth || !ops) return null;
    const now = Date.now();
    const weekTrades = ops.filter(
      (o) => now - new Date(o.date).getTime() <= 7 * 86_400_000,
    ).length;
    const withinRisk = ops.filter(
      (o) => o.riskPercent <= growth.plan.riskPerTrade + 1e-9,
    ).length;
    const riskDiscipline = ops.length ? (withinRisk / ops.length) * 100 : 100;
    return {
      weekTrades,
      weekTarget: growth.plan.tradesPerWeek,
      riskDiscipline,
    };
  }, [growth, ops]);

  const achievements = useMemo<Achievement[]>(() => {
    if (!growth || !analytics) return [];
    const s = growth.stats;
    const reached = (v: number) => s.currentCapital >= v;
    return [
      { title: "Primeiros passos", desc: "Regista a primeira operação", icon: Rocket, unlocked: s.totalTrades >= 1 },
      { title: "Consistente", desc: "20 operações registadas", icon: CheckCircle2, unlocked: s.totalTrades >= 20 },
      { title: "Veterano", desc: "50 operações registadas", icon: Medal, unlocked: s.totalTrades >= 50 },
      { title: "Rentável", desc: "Profit factor acima de 1.0", icon: Gauge, unlocked: s.profitFactor >= 1 },
      { title: "Edge sólido", desc: "Profit factor acima de 2.0", icon: Award, unlocked: s.profitFactor >= 2 },
      { title: "Sniper", desc: "Win rate acima de 55%", icon: Crosshair, unlocked: s.winRate >= 55 },
      { title: "Em chamas", desc: "5 vitórias seguidas", icon: Flame, unlocked: analytics.streaks.longestWin >= 5 },
      { title: "Disciplinado", desc: "Risco respeitado em todas as ops", icon: ShieldCheck, unlocked: (habits?.riskDiscipline ?? 0) >= 99.9 && s.totalTrades > 0 },
      { title: "Meta €2.500", desc: "Atingir €2.500 de capital", icon: TargetIcon, unlocked: reached(2500) },
      { title: "Meta €5.000", desc: "Atingir €5.000 de capital", icon: Trophy, unlocked: reached(5000) },
    ];
  }, [growth, analytics, habits]);

  if (!growth || !ops || !analytics || !habits) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <PageTransition>
      <PageHeader
        title="Metas"
        subtitle="Objetivos de capital, disciplina e consistência."
      />

      {/* Habits */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
        <StatCard
          index={0}
          label="Ritmo semanal"
          tone="brand"
          icon={CalendarRange}
          value={`${habits.weekTrades} / ${habits.weekTarget}`}
          hint="operações vs. plano"
        />
        <StatCard
          index={1}
          label="Disciplina de risco"
          tone={habits.riskDiscipline >= 90 ? "profit" : "warn"}
          icon={ShieldCheck}
          value={formatPercent(habits.riskDiscipline, 0)}
          hint="ops dentro do risco definido"
        />
        <StatCard
          index={2}
          label="Sequência atual"
          tone={analytics.streaks.currentType === "win" ? "profit" : analytics.streaks.currentType === "loss" ? "loss" : "neutral"}
          icon={Flame}
          value={`${analytics.streaks.current}${analytics.streaks.currentType === "win" ? "V" : analytics.streaks.currentType === "loss" ? "D" : ""}`}
          hint={`recorde ${analytics.streaks.longestWin}V`}
        />
      </div>

      {/* Monthly goal */}
      <MonthlyGoalCard data={growth.monthlyGoal} />

      {/* Capital milestones */}
      <Card>
        <div className="p-5">
          <SectionHeading
            title="Marcos de Capital"
            subtitle="Geridos no Plano de Crescimento"
            action={
              growth.nextMilestone ? (
                <Badge variant="brand" className="h-8 px-3">
                  Próximo: {growth.nextMilestone.label}
                </Badge>
              ) : undefined
            }
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {growth.milestones.map((m) => (
              <div
                key={m.id}
                className="flex flex-col gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{m.label}</span>
                  {m.reached ? (
                    <Badge variant="profit">Atingido</Badge>
                  ) : (
                    <span className="text-xs text-muted-2">
                      {formatCurrency(m.value - growth.stats.currentCapital)} em falta
                    </span>
                  )}
                </div>
                <Progress value={m.progress} />
                <span className="text-xs text-muted">
                  {formatPercent(m.progress * 100, 0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Achievements */}
      <Card>
        <div className="p-5">
          <SectionHeading
            title="Conquistas"
            subtitle="Desbloqueia badges ao evoluir"
            action={
              <Badge variant="neutral" className="h-8 px-3">
                {unlockedCount} / {achievements.length}
              </Badge>
            }
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {achievements.map((a, i) => {
              const Icon = a.icon;
              return (
                <motion.div
                  key={a.title}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-colors",
                    a.unlocked
                      ? "border-[color-mix(in_oklab,var(--brand),transparent_60%)] bg-[var(--brand-soft)]"
                      : "border-[var(--border)] bg-[var(--card)] opacity-60",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-xl",
                      a.unlocked
                        ? "bg-[linear-gradient(135deg,var(--brand),var(--brand-2))] text-white shadow-lg"
                        : "bg-[var(--card-hover)] text-muted-2",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold leading-tight">{a.title}</p>
                    <p className="mt-0.5 text-[11px] leading-tight text-muted">{a.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </Card>
    </PageTransition>
  );
}
