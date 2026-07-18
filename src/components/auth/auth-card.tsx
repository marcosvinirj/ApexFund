"use client";

import { motion } from "framer-motion";
import { Zap } from "lucide-react";

/** Shared glass-card frame for the standalone auth pages. */
export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <div className="app-bg" aria-hidden />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="glass card-shadow w-full max-w-md rounded-3xl p-8"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--brand),var(--brand-2))] shadow-lg">
            <Zap className="h-6 w-6 text-white" fill="white" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        {children}
      </motion.div>
    </div>
  );
}

/** Shows a dev-mode fallback link when no email provider is configured. */
export function DevLinkNotice({ href }: { href: string }) {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--card)] p-3 text-xs text-muted">
      <p className="mb-1 font-medium text-foreground">Modo de desenvolvimento</p>
      <p className="mb-2">
        Nenhum serviço de email está configurado, por isso o link não foi
        enviado. Usa-o diretamente:
      </p>
      <a
        href={href}
        className="break-all font-medium text-[var(--brand)] hover:underline"
      >
        {href}
      </a>
    </div>
  );
}
