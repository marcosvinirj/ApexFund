"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Search, Trash2, Pencil, X, ArrowUp, ArrowDown } from "lucide-react";
import {
  apiSend,
  useApi,
  type GrowthPlan,
  type Operation,
} from "@/lib/api";
import type { OperationResult } from "@/lib/types";
import { INSTRUMENT_GROUPS } from "@/lib/instruments";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Label, Select, Input } from "@/components/ui/input";
import { InstrumentSelect } from "@/components/ui/instrument-select";
import { Modal } from "@/components/ui/modal";
import { PageTransition, PageHeader, Skeleton } from "@/components/ui/page";
import {
  formatCurrency,
  formatDate,
  formatSigned,
  cn,
} from "@/lib/utils";

const RESULT_META: Record<
  OperationResult,
  { label: string; variant: "profit" | "loss" | "neutral" }
> = {
  win: { label: "Ganho", variant: "profit" },
  loss: { label: "Perda", variant: "loss" },
  breakeven: { label: "Break-even", variant: "neutral" },
};

export default function OperacoesPage() {
  const { data: ops, refresh } = useApi<Operation[]>("/api/operations");
  const { data: plan } = useApi<GrowthPlan>("/api/plan");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Operation | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<OperationResult | "all">("all");

  const filtered = useMemo(() => {
    if (!ops) return [];
    return [...ops]
      .reverse()
      .filter((o) => (filter === "all" ? true : o.result === filter))
      .filter((o) =>
        search ? o.pair.toLowerCase().includes(search.toLowerCase()) : true,
      );
  }, [ops, search, filter]);

  // Risk was stored as a % of the balance at the time of the trade; recover
  // the € amount actually risked by walking the balance chain chronologically.
  const riskAmountById = useMemo(() => {
    const map = new Map<string, number>();
    if (!ops || !plan) return map;
    let balanceBefore = plan.initialCapital;
    for (const op of ops) {
      map.set(op.id, (op.riskPercent / 100) * balanceBefore);
      balanceBefore = op.balanceAfter;
    }
    return map;
  }, [ops, plan]);

  const currentCapital = ops?.length
    ? ops[ops.length - 1].balanceAfter
    : (plan?.initialCapital ?? 0);

  if (!ops || !plan) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <PageTransition>
      <PageHeader
        title="Operações"
        subtitle="Regista e acompanha cada trade. Os cálculos atualizam automaticamente."
        action={
          <Button onClick={() => setOpen((o) => !o)}>
            {open ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {open ? "Fechar" : "Registar operação"}
          </Button>
        }
      />

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <OperationForm
              plan={plan}
              currentCapital={currentCapital}
              onCreated={() => {
                refresh();
                setOpen(false);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" />
          <Input
            placeholder="Procurar por par…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {(["all", "win", "loss", "breakeven"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                filter === f
                  ? "bg-[var(--brand-soft)] text-[var(--brand)]"
                  : "text-muted hover:bg-[var(--card)] hover:text-foreground",
              )}
            >
              {f === "all" ? "Todas" : RESULT_META[f].label}
            </button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-muted-2">
                <th className="px-5 py-3 font-medium">Data</th>
                <th className="px-5 py-3 font-medium">Par</th>
                <th className="px-5 py-3 font-medium">Direção</th>
                <th className="px-5 py-3 font-medium">Resultado</th>
                <th className="px-5 py-3 text-right font-medium">Risco</th>
                <th className="px-5 py-3 text-right font-medium">R</th>
                <th className="px-5 py-3 text-right font-medium">P&L</th>
                <th className="px-5 py-3 text-right font-medium">Saldo</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((op) => (
                <tr
                  key={op.id}
                  className="group border-b border-[var(--border)] transition-colors last:border-0 hover:bg-[var(--card)]"
                >
                  <td className="px-5 py-3 text-muted">{formatDate(op.date)}</td>
                  <td className="px-5 py-3 font-medium">{op.pair}</td>
                  <td className="px-5 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-xs font-medium",
                        op.direction === "long"
                          ? "text-[var(--profit)]"
                          : "text-[var(--loss)]",
                      )}
                    >
                      {op.direction === "long" ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )}
                      {op.direction === "long" ? "Long" : "Short"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={RESULT_META[op.result].variant}>
                      {RESULT_META[op.result].label}
                    </Badge>
                  </td>
                  <td className="tnum px-5 py-3 text-right text-muted">
                    {formatCurrency(riskAmountById.get(op.id) ?? 0, true)}
                  </td>
                  <td className="tnum px-5 py-3 text-right">
                    {op.rMultiple > 0 ? "+" : ""}
                    {op.rMultiple}R
                  </td>
                  <td
                    className="tnum px-5 py-3 text-right font-semibold"
                    style={{
                      color: op.pnl >= 0 ? "var(--profit)" : "var(--loss)",
                    }}
                  >
                    {formatSigned(op.pnl, true)}
                  </td>
                  <td className="tnum px-5 py-3 text-right text-muted">
                    {formatCurrency(op.balanceAfter, true)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditing(op)}
                        className="text-muted-2 opacity-0 transition-opacity hover:text-[var(--brand)] group-hover:opacity-100"
                        aria-label="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={async () => {
                          await apiSend(`/api/operations/${op.id}`, "DELETE");
                          refresh();
                        }}
                        className="text-muted-2 opacity-0 transition-opacity hover:text-[var(--loss)] group-hover:opacity-100"
                        aria-label="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-muted">
                    Nenhuma operação encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <OperationEditModal
        plan={plan}
        op={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          refresh();
          setEditing(null);
        }}
      />
    </PageTransition>
  );
}

function OperationForm({
  plan,
  currentCapital,
  onCreated,
}: {
  plan: GrowthPlan;
  currentCapital: number;
  onCreated: () => void;
}) {
  const base = currentCapital || plan.initialCapital;
  const [pair, setPair] = useState(INSTRUMENT_GROUPS[0].options[0]);
  const [direction, setDirection] = useState<"long" | "short">("long");
  const [result, setResult] = useState<OperationResult>("win");
  const [riskAmount, setRiskAmount] = useState(
    Math.round((plan.riskPerTrade / 100) * base * 100) / 100,
  );
  const [rMultiple, setRMultiple] = useState(plan.riskReward);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  function onResultChange(r: OperationResult) {
    setResult(r);
    setRMultiple(r === "win" ? plan.riskReward : r === "loss" ? -1 : 0);
  }

  const riskPercent = base > 0 ? (riskAmount / base) * 100 : 0;
  const potentialReturn = riskAmount * rMultiple;

  async function submit() {
    setBusy(true);
    try {
      await apiSend("/api/operations", "POST", {
        date,
        pair,
        direction,
        result,
        riskPercent,
        rMultiple,
      });
      onCreated();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mb-1">
      <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 lg:grid-cols-6">
        <div className="flex flex-col gap-1.5">
          <Label>Data</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Par</Label>
          <InstrumentSelect value={pair} onChange={setPair} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Direção</Label>
          <Select
            value={direction}
            onChange={(e) => setDirection(e.target.value as "long" | "short")}
          >
            <option value="long">Long</option>
            <option value="short">Short</option>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Resultado</Label>
          <Select
            value={result}
            onChange={(e) => onResultChange(e.target.value as OperationResult)}
          >
            <option value="win">Ganho</option>
            <option value="loss">Perda</option>
            <option value="breakeven">Break-even</option>
          </Select>
        </div>
        <Field
          label="Risco (€)"
          prefix="€"
          type="number"
          step="1"
          min="0"
          value={riskAmount}
          onChange={(e) => setRiskAmount(Number(e.target.value))}
        />
        <Field
          label="R obtido"
          type="number"
          step="0.1"
          value={rMultiple}
          onChange={(e) => setRMultiple(Number(e.target.value))}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-5">
        <p className="text-xs text-muted">
          Arriscas{" "}
          <span className="font-semibold text-foreground">
            {formatCurrency(riskAmount, true)}
          </span>{" "}
          ({riskPercent.toFixed(2)}% do capital atual) para{" "}
          <span
            className="font-semibold"
            style={{ color: potentialReturn >= 0 ? "var(--profit)" : "var(--loss)" }}
          >
            {formatSigned(potentialReturn, true)}
          </span>
          .
        </p>
        <Button onClick={submit} disabled={busy}>
          {busy ? "A registar…" : "Guardar operação"}
        </Button>
      </div>
    </Card>
  );
}

function OperationEditModal({
  plan,
  op,
  onClose,
  onSaved,
}: {
  plan: GrowthPlan;
  op: Operation | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <Modal open={!!op} onClose={onClose} title="Editar operação">
      {op && (
        <OperationEditForm
          key={op.id}
          plan={plan}
          op={op}
          onClose={onClose}
          onSaved={onSaved}
        />
      )}
    </Modal>
  );
}

function OperationEditForm({
  plan,
  op,
  onClose,
  onSaved,
}: {
  plan: GrowthPlan;
  op: Operation;
  onClose: () => void;
  onSaved: () => void;
}) {
  // Capital right before this trade — stable, drives the €↔% conversion.
  const balanceBefore = op.balanceAfter - op.pnl;
  const [pair, setPair] = useState(op.pair);
  const [direction, setDirection] = useState<"long" | "short">(op.direction);
  const [result, setResult] = useState<OperationResult>(op.result);
  const [riskAmount, setRiskAmount] = useState(
    Math.round((op.riskPercent / 100) * balanceBefore * 100) / 100,
  );
  const [rMultiple, setRMultiple] = useState(op.rMultiple);
  const [date, setDate] = useState(op.date);
  const [busy, setBusy] = useState(false);

  function onResultChange(r: OperationResult) {
    setResult(r);
    setRMultiple(r === "win" ? plan.riskReward : r === "loss" ? -1 : 0);
  }

  const riskPercent =
    balanceBefore > 0 ? (riskAmount / balanceBefore) * 100 : op.riskPercent;
  const potentialReturn = riskAmount * rMultiple;

  async function submit() {
    setBusy(true);
    try {
      await apiSend(`/api/operations/${op.id}`, "PATCH", {
        date,
        pair,
        direction,
        result,
        riskPercent,
        rMultiple,
        notes: op.notes,
      });
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Data</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Par</Label>
          <InstrumentSelect value={pair} onChange={setPair} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Direção</Label>
          <Select
            value={direction}
            onChange={(e) => setDirection(e.target.value as "long" | "short")}
          >
            <option value="long">Long</option>
            <option value="short">Short</option>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Resultado</Label>
          <Select
            value={result}
            onChange={(e) => onResultChange(e.target.value as OperationResult)}
          >
            <option value="win">Ganho</option>
            <option value="loss">Perda</option>
            <option value="breakeven">Break-even</option>
          </Select>
        </div>
        <Field
          label="Risco (€)"
          prefix="€"
          type="number"
          step="1"
          min="0"
          value={riskAmount}
          onChange={(e) => setRiskAmount(Number(e.target.value))}
        />
        <Field
          label="R obtido"
          type="number"
          step="0.1"
          value={rMultiple}
          onChange={(e) => setRMultiple(Number(e.target.value))}
        />
      </div>

      <p className="rounded-xl bg-[var(--card-hover)] p-3 text-xs leading-relaxed text-muted">
        Arriscas{" "}
        <span className="font-semibold text-foreground">
          {formatCurrency(riskAmount, true)}
        </span>{" "}
        ({riskPercent.toFixed(2)}% do capital antes desta operação) para{" "}
        <span
          className="font-semibold"
          style={{ color: potentialReturn >= 0 ? "var(--profit)" : "var(--loss)" }}
        >
          {formatSigned(potentialReturn, true)}
        </span>
        . Os saldos seguintes são recalculados automaticamente.
      </p>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={submit} disabled={busy}>
          {busy ? "A guardar…" : "Guardar alterações"}
        </Button>
      </div>
    </div>
  );
}
