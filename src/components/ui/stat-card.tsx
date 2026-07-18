"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "brand" | "profit" | "loss" | "info" | "warn" | "neutral";

const toneMap: Record<Tone, string> = {
  brand: "bg-[var(--brand-soft)] text-[var(--brand)]",
  profit: "bg-[var(--profit-soft)] text-[var(--profit)]",
  loss: "bg-[var(--loss-soft)] text-[var(--loss)]",
  info: "bg-[var(--info-soft)] text-[var(--info)]",
  warn: "bg-[var(--warn-soft)] text-[var(--warn)]",
  neutral: "bg-[var(--card-hover)] text-muted",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  delta,
  hint,
  index = 0,
}: {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  tone?: Tone;
  delta?: { text: string; positive?: boolean };
  hint?: string;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3 }}
      className="glass card-shadow group relative overflow-hidden rounded-2xl p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            {label}
          </p>
          <div className="tnum mt-2 text-2xl font-semibold tracking-tight sm:text-[1.65rem]">
            {value}
          </div>
        </div>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            toneMap[tone],
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
      </div>
      {(delta || hint) && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          {delta && (
            <span
              className={cn(
                "font-medium",
                delta.positive === undefined
                  ? "text-muted"
                  : delta.positive
                    ? "text-[var(--profit)]"
                    : "text-[var(--loss)]",
              )}
            >
              {delta.text}
            </span>
          )}
          {hint && <span className="text-muted-2">{hint}</span>}
        </div>
      )}
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[var(--brand-soft)] opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
    </motion.div>
  );
}

export function SectionHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
