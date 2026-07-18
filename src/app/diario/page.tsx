"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  Trash2,
  Pencil,
  TrendingUp,
  TrendingDown,
  Minus,
  NotebookPen,
} from "lucide-react";
import { apiSend, useApi } from "@/lib/api";
import type { JournalBias, JournalEntry } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Field } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { StarRating } from "@/components/ui/stars";
import { PageTransition, PageHeader, Skeleton } from "@/components/ui/page";
import { formatDate, cn } from "@/lib/utils";

const SMC_TAGS = [
  "BOS",
  "CHoCH",
  "Order Block",
  "FVG",
  "Liquidity Sweep",
  "Mitigation",
  "Breaker",
  "Premium/Discount",
  "Imbalance",
  "Fibonacci",
];

const BIAS_META: Record<
  JournalBias,
  { label: string; variant: "profit" | "loss" | "neutral"; icon: typeof TrendingUp }
> = {
  bullish: { label: "Alta", variant: "profit", icon: TrendingUp },
  bearish: { label: "Baixa", variant: "loss", icon: TrendingDown },
  neutral: { label: "Neutro", variant: "neutral", icon: Minus },
};

export default function DiarioPage() {
  const { data: entries, refresh } = useApi<JournalEntry[]>("/api/journal");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<JournalEntry | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<JournalBias | "all">("all");

  const filtered = useMemo(() => {
    if (!entries) return [];
    return entries
      .filter((e) => (filter === "all" ? true : e.bias === filter))
      .filter((e) =>
        search
          ? (e.title + " " + (e.pair ?? "") + " " + e.tags.join(" "))
              .toLowerCase()
              .includes(search.toLowerCase())
          : true,
      );
  }, [entries, search, filter]);

  if (!entries) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  function openNew() {
    setEditing(null);
    setOpen(true);
  }
  function openEdit(entry: JournalEntry) {
    setEditing(entry);
    setOpen(true);
  }

  return (
    <PageTransition>
      <PageHeader
        title="Diário SMC"
        subtitle="Regista o teu processo com base em Smart Money Concepts."
        action={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> Nova entrada
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" />
          <Input
            placeholder="Procurar por título, par ou tag…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {(["all", "bullish", "bearish", "neutral"] as const).map((f) => (
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
              {f === "all" ? "Todas" : BIAS_META[f].label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--brand-soft)]">
              <NotebookPen className="h-7 w-7 text-[var(--brand)]" />
            </div>
            <p className="font-medium">
              {entries.length === 0
                ? "Ainda não tens entradas no diário"
                : "Nenhuma entrada corresponde ao filtro"}
            </p>
            <p className="max-w-sm text-sm text-muted">
              Documenta o contexto, a liquidez e a razão de cada operação para
              identificares padrões.
            </p>
            {entries.length === 0 && (
              <Button onClick={openNew} className="mt-1">
                <Plus className="h-4 w-4" /> Criar primeira entrada
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((entry, i) => {
            const bias = BIAS_META[entry.bias];
            const BiasIcon = bias.icon;
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card className="group flex h-full flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-2">{formatDate(entry.date)}</p>
                      <h3 className="mt-0.5 truncate font-semibold">{entry.title}</h3>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => openEdit(entry)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-2 hover:bg-[var(--card-hover)] hover:text-foreground"
                        aria-label="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={async () => {
                          await apiSend(`/api/journal/${entry.id}`, "DELETE");
                          refresh();
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-2 hover:text-[var(--loss)]"
                        aria-label="Eliminar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Badge variant={bias.variant}>
                      <BiasIcon className="h-3 w-3" /> {bias.label}
                    </Badge>
                    {entry.pair && <Badge variant="neutral">{entry.pair}</Badge>}
                    <StarRating value={entry.rating} size={13} />
                  </div>

                  {entry.notes && (
                    <p className="mt-3 line-clamp-3 text-sm text-muted">{entry.notes}</p>
                  )}

                  {entry.tags.length > 0 && (
                    <div className="mt-auto flex flex-wrap gap-1 pt-3">
                      {entry.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-md bg-[var(--card-hover)] px-2 py-0.5 text-[11px] text-muted"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <EntryModal
        open={open}
        onClose={() => setOpen(false)}
        editing={editing}
        onSaved={() => {
          setOpen(false);
          refresh();
        }}
      />
    </PageTransition>
  );
}

function EntryModal({
  open,
  onClose,
  editing,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editing: JournalEntry | null;
  onSaved: () => void;
}) {
  // Re-mount the form when the target entry changes so fields reset cleanly.
  return (
    <Modal open={open} onClose={onClose} title={editing ? "Editar entrada" : "Nova entrada"}>
      {open && <EntryForm key={editing?.id ?? "new"} editing={editing} onSaved={onSaved} onClose={onClose} />}
    </Modal>
  );
}

function EntryForm({
  editing,
  onSaved,
  onClose,
}: {
  editing: JournalEntry | null;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [date, setDate] = useState(editing?.date ?? new Date().toISOString().slice(0, 10));
  const [title, setTitle] = useState(editing?.title ?? "");
  const [pair, setPair] = useState(editing?.pair ?? "");
  const [bias, setBias] = useState<JournalBias>(editing?.bias ?? "neutral");
  const [tags, setTags] = useState<string[]>(editing?.tags ?? []);
  const [rating, setRating] = useState(editing?.rating ?? 3);
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleTag(t: string) {
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  async function save() {
    if (!title.trim()) {
      setError("O título é obrigatório.");
      return;
    }
    setBusy(true);
    setError(null);
    const payload = { date, title, pair, bias, tags, rating, notes };
    try {
      if (editing) await apiSend(`/api/journal/${editing.id}`, "PATCH", payload);
      else await apiSend("/api/journal", "POST", payload);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao guardar.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Data</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <Field label="Par (opcional)" placeholder="EUR/USD" value={pair} onChange={(e) => setPair(e.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Título</Label>
        <Input placeholder="Ex: Long EUR/USD após CHoCH em H1" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Viés</Label>
        <div className="grid grid-cols-3 gap-2">
          {(["bullish", "neutral", "bearish"] as const).map((b) => {
            const meta = BIAS_META[b];
            const Icon = meta.icon;
            const active = bias === b;
            return (
              <button
                key={b}
                type="button"
                onClick={() => setBias(b)}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-xl border py-2 text-sm font-medium transition-colors",
                  active
                    ? "border-[var(--brand)] bg-[var(--brand-soft)] text-foreground"
                    : "border-[var(--border)] text-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" /> {meta.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Conceitos SMC</Label>
        <div className="flex flex-wrap gap-1.5">
          {SMC_TAGS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => toggleTag(t)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                tags.includes(t)
                  ? "bg-[var(--brand-soft)] text-[var(--brand)]"
                  : "bg-[var(--card-hover)] text-muted hover:text-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Label>Avaliação da execução</Label>
        <StarRating value={rating} onChange={setRating} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Notas</Label>
        <Textarea
          placeholder="Contexto, liquidez, order blocks, razão de entrada, gestão…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {error && (
        <p className="rounded-xl bg-[var(--loss-soft)] px-3 py-2 text-sm text-[var(--loss)]">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={save} disabled={busy}>
          {busy ? "A guardar…" : editing ? "Guardar alterações" : "Criar entrada"}
        </Button>
      </div>
    </div>
  );
}
