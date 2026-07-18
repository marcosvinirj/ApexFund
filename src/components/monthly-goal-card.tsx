"use client";

import { Target } from "lucide-react";
import type { MonthlyGoalProgress } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { SectionHeading } from "@/components/ui/stat-card";
import { formatCurrency, formatPercent, formatSigned } from "@/lib/utils";

const STATUS_META = {
  above: { label: "Acima", variant: "profit" as const, emoji: "🟢" },
  "on-track": { label: "Em ritmo", variant: "warn" as const, emoji: "🟡" },
  below: { label: "Abaixo", variant: "loss" as const, emoji: "🔴" },
};

export function MonthlyGoalCard({ data }: { data: MonthlyGoalProgress }) {
  const status = STATUS_META[data.status];
  const capitalizedMonth =
    data.monthLabel.charAt(0).toUpperCase() + data.monthLabel.slice(1);

  return (
    <Card className="relative overflow-hidden">
      <div className="p-5">
        <SectionHeading
          title="Meta do Mês"
          subtitle={capitalizedMonth}
          action={
            data.goal > 0 ? (
              <Badge variant={status.variant} className="shrink-0">
                {status.emoji} {status.label}
              </Badge>
            ) : undefined
          }
        />

        {data.goal <= 0 ? (
          <p className="py-6 text-sm text-muted">
            Define uma meta mensal no Plano de Crescimento para acompanhares o
            progresso aqui.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-3xl font-semibold tracking-tight">
                  <span
                    style={{
                      color:
                        data.monthPnl >= 0 ? "var(--profit)" : "var(--loss)",
                    }}
                  >
                    {formatSigned(data.monthPnl, true)}
                  </span>
                </p>
                <p className="mt-1 text-sm text-muted">
                  de {formatCurrency(data.goal, true)} de meta
                </p>
              </div>
              <Target className="h-8 w-8 shrink-0 text-[var(--brand)] opacity-70" />
            </div>

            <Progress value={data.progress} />

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">
                {formatPercent(Math.max(0, data.progress) * 100, 0)} concluído
              </span>
              <span className="text-muted-2">
                {data.daysRemaining}{" "}
                {data.daysRemaining === 1 ? "dia restante" : "dias restantes"}
              </span>
            </div>

            <p className="rounded-xl bg-[var(--card-hover)] p-3 text-xs leading-relaxed text-muted">
              {data.reached ? (
                <>🎉 Meta mensal atingida! Continua para reforçar o resultado.</>
              ) : (
                <>
                  Faltam{" "}
                  <span className="font-semibold text-foreground">
                    {formatCurrency(data.remaining, true)}
                  </span>{" "}
                  para a meta.{" "}
                  {data.tradesToGoal != null ? (
                    <>
                      Ao ritmo atual, precisas de cerca de{" "}
                      <span className="font-semibold text-foreground">
                        {data.tradesToGoal}{" "}
                        {data.tradesToGoal === 1 ? "operação" : "operações"}
                      </span>{" "}
                      para lá chegar
                      {data.reachableInMonth
                        ? " ainda este mês."
                        : ", o que pode ultrapassar o mês."}
                    </>
                  ) : (
                    "Com a expectativa atual do plano, a meta não é atingível."
                  )}
                </>
              )}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
