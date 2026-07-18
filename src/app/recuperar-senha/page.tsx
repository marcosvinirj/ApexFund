"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { AuthCard, DevLinkNotice } from "@/components/auth/auth-card";

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Ocorreu um erro.");
      setDevLink(data.devLink ?? null);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocorreu um erro.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <AuthCard
        title="Verifica o teu email"
        subtitle="Se existir uma conta com esse email, enviámos um link para redefinir a palavra-passe."
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--profit-soft)]">
            <CheckCircle2 className="h-7 w-7 text-[var(--profit)]" />
          </div>
          <p className="text-sm text-muted">
            O link expira em 1 hora. Verifica também a pasta de spam.
          </p>
          {devLink && <DevLinkNotice href={devLink} />}
          <Link
            href="/login"
            className="mt-2 flex items-center gap-1.5 text-sm font-medium text-[var(--brand)] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar ao início de sessão
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Recuperar palavra-passe"
      subtitle="Indica o teu email e enviamos-te um link para definires uma nova."
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Email</Label>
          <div className="relative flex items-center">
            <span className="pointer-events-none absolute left-3 text-muted-2">
              <Mail className="h-4 w-4" />
            </span>
            <Input
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="pl-9"
            />
          </div>
        </div>

        {error && (
          <p className="rounded-xl bg-[var(--loss-soft)] px-3 py-2 text-sm text-[var(--loss)]">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" disabled={busy} className="mt-1 w-full">
          {busy ? "A enviar…" : "Enviar link de recuperação"}
          {!busy && <ArrowRight className="h-4 w-4" />}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Lembraste-te da palavra-passe?{" "}
        <Link
          href="/login"
          className="font-medium text-[var(--brand)] hover:underline"
        >
          Entrar
        </Link>
      </p>
    </AuthCard>
  );
}
