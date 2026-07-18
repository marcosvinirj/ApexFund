"use client";

import { useMemo, useState } from "react";
import { Download, Printer, FileText, TrendingUp, Percent, Gauge, Hash } from "lucide-react";
import { useApi, type Operation } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard, SectionHeading } from "@/components/ui/stat-card";
import { PageTransition, PageHeader, Skeleton } from "@/components/ui/page";
import {
  formatCurrency,
  formatPercent,
  formatSigned,
  formatDate,
  cn,
} from "@/lib/utils";

type Period = "month" | "quarter" | "all";
const PERIODS: { key: Period; label: string; days: number | null }[] = [
  { key: "month", label: "Este mês", days: 30 },
  { key: "quarter", label: "3 meses", days: 90 },
  { key: "all", label: "Tudo", days: null },
];

export default function RelatoriosPage() {
  const { data: ops } = useApi<Operation[]>("/api/operations");
  const [period, setPeriod] = useState<Period>("all");

  const inPeriod = useMemo(() => {
    if (!ops) return [];
    const days = PERIODS.find((p) => p.key === period)?.days ?? null;
    if (days == null) return ops;
    const cutoff = Date.now() - days * 86_400_000;
    return ops.filter((o) => new Date(o.date).getTime() >= cutoff);
  }, [ops, period]);

  const summary = useMemo(() => computeSummary(inPeriod), [inPeriod]);
  const monthly = useMemo(() => computeMonthly(ops ?? []), [ops]);

  if (!ops) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  function exportCsv() {
    const headers = [
      "Data",
      "Par",
      "Direção",
      "Resultado",
      "Risco %",
      "R",
      "P&L (EUR)",
      "Saldo (EUR)",
    ];
    const rows = [...ops!]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((o) => [
        o.date,
        o.pair,
        o.direction === "long" ? "Long" : "Short",
        o.result,
        o.riskPercent,
        o.rMultiple,
        o.pnl.toFixed(2),
        o.balanceAfter.toFixed(2),
      ]);
    const csv =
      "﻿" +
      [headers, ...rows].map((r) => r.join(";")).join("\r\n"); // ; + BOM for Excel pt-PT
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `apexfund-operacoes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <PageTransition>
      <PageHeader
        title="Relatórios"
        subtitle="Resumo do desempenho e exportação dos teus dados."
        action={
          <div className="flex items-center gap-2 print-hide">
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Imprimir / PDF
            </Button>
            <Button onClick={exportCsv}>
              <Download className="h-4 w-4" /> Exportar CSV
            </Button>
          </div>
        }
      />

      <div className="flex items-center gap-1.5 print-hide">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              period === p.key
                ? "bg-[var(--brand-soft)] text-[var(--brand)]"
                : "text-muted hover:bg-[var(--card)] hover:text-foreground",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard index={0} label="Operações" tone="neutral" icon={Hash} value={summary.trades.toString()} />
        <StatCard
          index={1}
          label="Resultado"
          tone={summary.pnl >= 0 ? "profit" : "loss"}
          icon={TrendingUp}
          value={
            <span style={{ color: summary.pnl >= 0 ? "var(--profit)" : "var(--loss)" }}>
              {formatSigned(summary.pnl)}
            </span>
          }
        />
        <StatCard index={2} label="Win Rate" tone="info" icon={Percent} value={formatPercent(summary.winRate, 1)} hint={`${summary.wins}V / ${summary.losses}D`} />
        <StatCard index={3} label="Profit Factor" tone="brand" icon={Gauge} value={summary.profitFactor.toFixed(2)} />
      </div>

      <Card className="overflow-hidden">
        <div className="p-5 pb-2">
          <SectionHeading title="Relatório Mensal" subtitle="Desempenho agregado por mês" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-muted-2">
                <th className="px-5 py-3 font-medium">Mês</th>
                <th className="px-5 py-3 text-right font-medium">Operações</th>
                <th className="px-5 py-3 text-right font-medium">Win Rate</th>
                <th className="px-5 py-3 text-right font-medium">Profit Factor</th>
                <th className="px-5 py-3 text-right font-medium">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {monthly.map((m) => (
                <tr key={m.key} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--card)]">
                  <td className="px-5 py-3 font-medium capitalize">{m.label}</td>
                  <td className="tnum px-5 py-3 text-right text-muted">{m.trades}</td>
                  <td className="tnum px-5 py-3 text-right">{formatPercent(m.winRate, 0)}</td>
                  <td className="tnum px-5 py-3 text-right text-muted">{m.profitFactor.toFixed(2)}</td>
                  <td
                    className="tnum px-5 py-3 text-right font-semibold"
                    style={{ color: m.pnl >= 0 ? "var(--profit)" : "var(--loss)" }}
                  >
                    {formatSigned(m.pnl)}
                  </td>
                </tr>
              ))}
              {monthly.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-muted">
                    Sem operações registadas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-3 p-5 text-sm text-muted">
          <FileText className="h-5 w-5 shrink-0 text-[var(--brand)]" />
          <p>
            Relatório gerado a {formatDate(new Date().toISOString())}. O botão{" "}
            <span className="font-medium text-foreground">Imprimir / PDF</span> abre a
            caixa de impressão do navegador — escolhe “Guardar como PDF” para exportar.
          </p>
        </div>
      </Card>
    </PageTransition>
  );
}

function computeSummary(ops: Operation[]) {
  const wins = ops.filter((o) => o.result === "win").length;
  const losses = ops.filter((o) => o.result === "loss").length;
  const decided = wins + losses;
  const gp = ops.filter((o) => o.pnl > 0).reduce((s, o) => s + o.pnl, 0);
  const gl = Math.abs(ops.filter((o) => o.pnl < 0).reduce((s, o) => s + o.pnl, 0));
  return {
    trades: ops.length,
    wins,
    losses,
    winRate: decided ? (wins / decided) * 100 : 0,
    pnl: ops.reduce((s, o) => s + o.pnl, 0),
    profitFactor: gl ? gp / gl : gp > 0 ? 99 : 0,
  };
}

function computeMonthly(ops: Operation[]) {
  const map = new Map<string, Operation[]>();
  for (const o of ops) {
    const d = new Date(o.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(o);
  }
  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, list]) => {
      const [y, m] = key.split("-");
      const s = computeSummary(list);
      return {
        key,
        label: new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("pt-PT", {
          month: "long",
          year: "numeric",
        }),
        ...s,
      };
    });
}
