"use client";

import { motion } from "framer-motion";
import { Sparkles, type LucideIcon } from "lucide-react";
import { Card } from "./card";
import { Badge } from "./badge";
import { PageTransition, PageHeader } from "./page";

export function ComingSoon({
  icon: Icon,
  title,
  subtitle,
  features,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  features: { title: string; desc: string }[];
}) {
  return (
    <PageTransition>
      <PageHeader
        title={title}
        subtitle={subtitle}
        action={
          <Badge variant="brand" className="h-8 px-3">
            <Sparkles className="h-3.5 w-3.5" /> Em desenvolvimento
          </Badge>
        }
      />
      <Card className="relative overflow-hidden">
        <div className="flex flex-col items-center gap-4 px-6 py-14 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 18 }}
            className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--brand),var(--brand-2))] shadow-xl"
          >
            <Icon className="h-8 w-8 text-white" />
          </motion.div>
          <div className="max-w-md">
            <h3 className="text-xl font-semibold">Esta secção está a caminho</h3>
            <p className="mt-2 text-sm text-muted">
              Faz parte da suite ApexFund. Abaixo, o que vais poder fazer aqui.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-px border-t border-[var(--border)] bg-[var(--border)] sm:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="bg-[var(--card-solid)] p-5">
              <p className="font-medium">{f.title}</p>
              <p className="mt-1 text-sm text-muted">{f.desc}</p>
            </div>
          ))}
        </div>
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[var(--brand-soft)] blur-3xl" />
      </Card>
    </PageTransition>
  );
}
