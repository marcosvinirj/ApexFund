"use client";

import { useState } from "react";
import { MailWarning, X, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

/**
 * Non-blocking banner shown to signed-in users who haven't confirmed their
 * email yet. Lets them re-request the verification link.
 */
export function VerifyEmailBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);

  if (!user || user.emailVerified || dismissed) return null;

  async function resend() {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/verify-email/resend", {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      setDevLink(data.devLink ?? null);
      setSent(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-4 flex flex-col gap-2 rounded-2xl border border-[color-mix(in_oklab,var(--warn),transparent_65%)] bg-[var(--warn-soft)] p-4">
      <div className="flex items-start gap-3">
        <MailWarning className="mt-0.5 h-5 w-5 shrink-0 text-[var(--warn)]" />
        <div className="min-w-0 flex-1">
          {sent ? (
            <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <CheckCircle2 className="h-4 w-4 text-[var(--profit)]" />
              Email de verificação enviado para {user.email}.
            </p>
          ) : (
            <p className="text-sm text-foreground">
              <span className="font-medium">Confirma o teu email.</span>{" "}
              Enviámos um link para{" "}
              <span className="font-medium">{user.email}</span> — verifica a
              caixa de entrada para ativares totalmente a conta.
            </p>
          )}
          {devLink && (
            <a
              href={devLink}
              className="mt-1 block break-all text-xs font-medium text-[var(--brand)] hover:underline"
            >
              Link (modo dev): {devLink}
            </a>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!sent && (
            <button
              onClick={resend}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--card-solid)] px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-[var(--card-hover)] disabled:opacity-50"
            >
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {busy ? "A enviar…" : "Reenviar"}
            </button>
          )}
          <button
            onClick={() => setDismissed(true)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-2 hover:bg-[var(--card-hover)] hover:text-foreground"
            aria-label="Dispensar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
