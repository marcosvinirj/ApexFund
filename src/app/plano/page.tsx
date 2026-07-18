"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Rocket,
  Save,
  CalendarClock,
  TrendingUp,
  Coins,
  Flag,
  Plus,
  Trash2,
  Check,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import {
  apiSend,
  useApi,
  type GrowthResponse,
  type MilestoneProgress,
  type Operation,
} from "@/lib/api";
import type { GrowthPlan } from "@/lib/types";
import { computeProjection } from "@/lib/growth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Field } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { CountUp } from "@/components/ui/count-up";
import { PageTransition, PageHeader, Skeleton } from "@/components/ui/page";
import { SectionHeading } from "@/components/ui/stat-card";
import { GrowthChart } from "@/components/charts/growth-chart";
import {
  formatCurrency,
  formatPercent,
  formatSignedPercent,
} from "@/lib/utils";

const PLAN_KEYS: (keyof GrowthPlan)[] = [
  "initialCapital",
  "targetCapital",
  "monthlyGoal",
  "riskPerTrade",
  "riskReward",
  "winRate",
  "tradesPerWeek",
  "tradesPerMonth",
];

const STATUS_META = {
  above: { label: "Acima da projeção", variant: "profit", emoji: "🟢" },
  "on-track": { label: "Dentro da projeção", variant: "warn", emoji: "🟡" },
  below: { label: "Abaixo da projeção", variant: "loss", emoji: "🔴" },
} as const;

export default function PlanoPage() {
  const { data: growth, refresh } = useApi<GrowthResponse>("/api/growth");
  const { data: ops } = useApi<Operation[]>("/api/operations");
  const [draft, setDraft] = useState<GrowthPlan | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (growth && !draft) setDraft(growth.plan);
  }, [growth, draft]);

  const sim = useMemo(
    () =>
      draft
        ? computeProjection(draft, {
            baseCapital: growth?.stats.currentCapital ?? draft.initialCapital,
            operations: ops ?? [],
          })
        : null,
    [draft, ops, growth],
  );

  const dirty = useMemo(() => {
    if (!draft || !growth) return false;
    return PLAN_KEYS.some((k) => draft[k] !== growth.plan[k]);
  }, [draft, growth]);

  if (!draft || !growth || !sim) return <PlanoSkeleton />;

  const set = (patch: Partial<GrowthPlan>) =>
    setDraft((d) => (d ? { ...d, ...patch } : d));

  async function save() {
    if (!draft) return;
    setSaving(true);
    try {
      const updated = await apiSend<GrowthPlan>("/api/plan", "PATCH", draft);
      setDraft(updated);
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  const status = STATUS_META[growth.comparison.status];
  const monthsLabel =
    sim.monthsToTarget != null
      ? sim.monthsToTarget < 1
        ? "< 1 mês"
        : `${Math.round(sim.monthsToTarget)} ${Math.round(sim.monthsToTarget) === 1 ? "mês" : "meses"}`
      : "—";

  return (
    <PageTransition>
      <PageHeader
        title="Plano de Crescimento de Capital"
        subtitle="Visualiza a evolução projetada da tua banca com base na tua estratégia de gestão de risco."
        action={
          dirty ? (
            <Button onClick={save} disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? "A guardar…" : "Guardar plano"}
            </Button>
          ) : (
            <Badge variant="profit" className="h-9 px-3">
              <Check className="h-4 w-4" /> Plano guardado
            </Badge>
          )
        }
      />

      {/* Comparison banner */}
      <Card className="relative overflow-hidden border-l-2 border-l-[var(--brand)]">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-2xl">
              {status.emoji}
            </div>
            <div>
              <p className="text-sm text-muted">Resultado Real vs. Projeção</p>
              <p className="text-lg font-semibold">{status.label}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 sm:gap-6">
            <BannerFig label="Real" value={formatCurrency(growth.comparison.realNow)} />
            <BannerFig label="Projetado" value={formatCurrency(growth.comparison.projectedNow)} />
            <BannerFig
              label="Desvio"
              value={formatSignedPercent(growth.comparison.deltaPct)}
              tone={growth.comparison.status}
            />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Configuration */}
        <Card className="lg:col-span-1">
          <div className="flex flex-col gap-5 p-5">
            <SectionHeading title="Configurações" subtitle="Define a tua estratégia" />
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Capital inicial"
                prefix="€"
                type="number"
                value={draft.initialCapital}
                onChange={(e) => set({ initialCapital: Number(e.target.value) })}
              />
              <Field
                label="Meta final"
                prefix="€"
                type="number"
                value={draft.targetCapital}
                onChange={(e) => set({ targetCapital: Number(e.target.value) })}
              />
              <Field
                label="Meta mensal"
                prefix="€"
                type="number"
                value={draft.monthlyGoal}
                onChange={(e) => set({ monthlyGoal: Number(e.target.value) })}
              />
            </div>

            <Slider
              label="Risco por operação"
              value={draft.riskPerTrade}
              min={0.25}
              max={5}
              step={0.25}
              onChange={(v) => set({ riskPerTrade: v })}
              format={(v) => formatPercent(v, 2)}
            />
            <Slider
              label="Relação risco-retorno"
              value={draft.riskReward}
              min={3}
              max={10}
              step={0.5}
              onChange={(v) => set({ riskReward: v })}
              format={(v) => `${v}:1`}
              hint="Mínimo recomendado 3:1"
            />
            <Slider
              label="Taxa de acerto (win rate)"
              value={draft.winRate}
              min={20}
              max={80}
              step={1}
              onChange={(v) => set({ winRate: v })}
              format={(v) => formatPercent(v, 0)}
            />
            <Slider
              label="Operações por semana"
              value={draft.tradesPerWeek}
              min={1}
              max={30}
              step={1}
              onChange={(v) => set({ tradesPerWeek: v })}
              format={(v) => `${v}`}
            />
            <Slider
              label="Operações por mês"
              value={draft.tradesPerMonth}
              min={4}
              max={120}
              step={1}
              onChange={(v) => set({ tradesPerMonth: v })}
              format={(v) => `${v}`}
            />

            <div className="rounded-xl bg-[var(--card-hover)] p-3 text-xs leading-relaxed text-muted">
              Expectativa por operação:{" "}
              <span
                className="font-semibold"
                style={{
                  color:
                    sim.expectancyPerTrade >= 0
                      ? "var(--profit)"
                      : "var(--loss)",
                }}
              >
                {formatSignedPercent(sim.expectancyPerTrade * 100, 2)}
              </span>{" "}
              do capital.
            </div>
          </div>
        </Card>

        {/* Simulation + chart */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          {!sim.reachable && (
            <Card className="border-l-2 border-l-[var(--loss)]">
              <div className="flex items-start gap-3 p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--loss)]" />
                <p className="text-sm text-muted">
                  Com estes parâmetros, a meta não é atingível (expectativa
                  negativa ou meta ≤ capital). Aumenta a taxa de acerto, a
                  relação R:R ou reduz o risco.
                </p>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ResultTile
              icon={CalendarClock}
              label="Tempo até à meta"
              value={monthsLabel}
              tone="brand"
              highlight
            />
            <ResultTile
              icon={TrendingUp}
              label="Lucro / semana"
              value={<CountUp value={sim.expectedProfitWeek} format={(v) => formatCurrency(v)} />}
              tone="profit"
            />
            <ResultTile
              icon={Coins}
              label="Lucro / mês"
              value={<CountUp value={sim.expectedProfitMonth} format={(v) => formatCurrency(v)} />}
              tone="profit"
            />
            <ResultTile
              icon={Rocket}
              label="Lucro / ano"
              value={<CountUp value={sim.expectedProfitYear} format={(v) => formatCurrency(v)} />}
              tone="brand"
            />
          </div>

          <Card>
            <div className="flex items-center justify-between p-5 pb-0">
              <SectionHeading
                title="Gráfico de Crescimento"
                subtitle="Crescimento composto projetado vs. real"
              />
              <div className="hidden items-center gap-3 text-xs sm:flex">
                <LegendDot color="var(--profit)" label="Real" />
                <LegendDot color="var(--brand)" label="Projetado" />
              </div>
            </div>
            <div className="p-3 pt-2 sm:p-4">
              <GrowthChart
                points={sim.points}
                target={draft.targetCapital}
                height={340}
              />
            </div>
            <div className="grid grid-cols-2 gap-px border-t border-[var(--border)] bg-[var(--border)] sm:grid-cols-4">
              <FooterFig label="Cresc. semanal" value={formatSignedPercent(sim.weeklyGrowthPct)} />
              <FooterFig label="Cresc. mensal" value={formatSignedPercent(sim.monthlyGrowthPct)} />
              <FooterFig
                label="Trades até meta"
                value={sim.tradesToTarget != null ? String(sim.tradesToTarget) : "—"}
              />
              <FooterFig
                label="Data estimada"
                value={
                  sim.targetDate
                    ? new Date(sim.targetDate).toLocaleDateString("pt-PT", {
                        month: "short",
                        year: "numeric",
                      })
                    : "—"
                }
              />
            </div>
          </Card>
        </div>
      </div>

      {/* Milestones */}
      <MilestonesSection milestones={growth.milestones} onChange={refresh} />
    </PageTransition>
  );
}

/* ------------------------------------------------------------------ */

function MilestonesSection({
  milestones,
  onChange,
}: {
  milestones: MilestoneProgress[];
  onChange: () => void;
}) {
  const [value, setValue] = useState("");
  const [adding, setAdding] = useState(false);

  async function add() {
    const v = Number(value);
    if (!v || v <= 0) return;
    setAdding(true);
    try {
      await apiSend("/api/milestones", "POST", { value: v });
      setValue("");
      onChange();
    } finally {
      setAdding(false);
    }
  }

  async function remove(id: string) {
    await apiSend(`/api/milestones/${id}`, "DELETE");
    onChange();
  }

  return (
    <Card>
      <div className="p-5">
        <SectionHeading
          title="Marcos de Evolução"
          subtitle="Metas de capital ao longo do percurso"
          action={
            <div className="flex items-center gap-2">
              <Field
                prefix="€"
                type="number"
                placeholder="Meta personalizada"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-40"
              />
              <Button onClick={add} disabled={adding} size="md">
                <Plus className="h-4 w-4" />
                Adicionar
              </Button>
            </div>
          }
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {milestones.map((m, i) => (
            <div
              key={m.id}
              className="group relative flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={
                      "flex h-9 w-9 items-center justify-center rounded-xl " +
                      (m.reached
                        ? "bg-[var(--profit-soft)] text-[var(--profit)]"
                        : "bg-[var(--card-hover)] text-muted")
                    }
                  >
                    {m.reached ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Flag className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold tracking-tight">{m.label}</p>
                    {m.reached ? (
                      <span className="text-xs text-[var(--profit)]">
                        Atingido
                      </span>
                    ) : m.weeksAway != null ? (
                      <span className="text-xs text-muted-2">
                        ~{m.weeksAway} semanas
                      </span>
                    ) : (
                      <span className="text-xs text-muted-2">—</span>
                    )}
                  </div>
                </div>
                {!m.isDefault && (
                  <button
                    onClick={() => remove(m.id)}
                    className="text-muted-2 opacity-0 transition-opacity hover:text-[var(--loss)] group-hover:opacity-100"
                    aria-label="Remover marco"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Progress value={m.progress} />
              <div className="flex items-center justify-between text-xs text-muted">
                <span>{formatPercent(m.progress * 100, 0)}</span>
                {m.isDefault && (
                  <Badge variant="neutral" className="px-1.5 py-0.5">
                    Padrão
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function BannerFig({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "above" | "on-track" | "below";
}) {
  const color =
    tone === "above"
      ? "var(--profit)"
      : tone === "below"
        ? "var(--loss)"
        : tone === "on-track"
          ? "var(--warn)"
          : undefined;
  return (
    <div className="text-right">
      <p className="text-[11px] uppercase tracking-wide text-muted-2">{label}</p>
      <p className="tnum text-base font-semibold sm:text-lg" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

function ResultTile({
  icon: Icon,
  label,
  value,
  tone,
  highlight,
}: {
  icon: typeof Rocket;
  label: string;
  value: React.ReactNode;
  tone: "brand" | "profit";
  highlight?: boolean;
}) {
  return (
    <div
      className={
        "glass card-shadow flex flex-col gap-2 rounded-2xl p-4 " +
        (highlight
          ? "ring-1 ring-inset ring-[color-mix(in_oklab,var(--brand),transparent_55%)]"
          : "")
      }
    >
      <div
        className={
          "flex h-9 w-9 items-center justify-center rounded-xl " +
          (tone === "brand"
            ? "bg-[var(--brand-soft)] text-[var(--brand)]"
            : "bg-[var(--profit-soft)] text-[var(--profit)]")
        }
      >
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xs text-muted">{label}</p>
      <p className="tnum text-lg font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function FooterFig({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--card-solid)] p-3 text-center">
      <p className="text-[11px] uppercase tracking-wide text-muted-2">{label}</p>
      <p className="tnum mt-0.5 text-sm font-semibold">{value}</p>
    </div>
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

function PlanoSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-10 w-80" />
      <Skeleton className="h-24" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-[520px]" />
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Skeleton className="h-24" />
          <Skeleton className="h-96" />
        </div>
      </div>
    </div>
  );
}
