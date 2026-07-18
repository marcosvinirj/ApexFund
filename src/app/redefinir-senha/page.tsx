"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Eye, EyeOff, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { AuthCard } from "@/components/auth/auth-card";

export default function RedefinirSenhaPage() {
  return (
    <Suspense fallback={<AuthCard title="Redefinir palavra-passe">{null}</AuthCard>}>
      <ResetForm />
    </Suspense>
  );
}

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError("A palavra-passe precisa de pelo menos 6 caracteres.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Ocorreu um erro.");
      setDone(true);
      setTimeout(() => router.replace("/login"), 2200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocorreu um erro.");
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <AuthCard
        title="Link inválido"
        subtitle="Este link de recuperação está incompleto ou expirou."
      >
        <div className="text-center">
          <Link
            href="/recuperar-senha"
            className="text-sm font-medium text-[var(--brand)] hover:underline"
          >
            Pedir um novo link
          </Link>
        </div>
      </AuthCard>
    );
  }

  if (done) {
    return (
      <AuthCard
        title="Palavra-passe redefinida"
        subtitle="Já podes entrar com a tua nova palavra-passe."
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--profit-soft)]">
            <CheckCircle2 className="h-7 w-7 text-[var(--profit)]" />
          </div>
          <p className="text-sm text-muted">A redirecionar para o início de sessão…</p>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Nova palavra-passe"
      subtitle="Define uma palavra-passe segura para a tua conta."
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Nova palavra-passe</Label>
          <div className="relative flex items-center">
            <span className="pointer-events-none absolute left-3 text-muted-2">
              <Lock className="h-4 w-4" />
            </span>
            <Input
              type={showPw ? "text" : "password"}
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="px-9"
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="absolute right-3 text-muted-2 hover:text-foreground"
              aria-label="Mostrar palavra-passe"
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error && (
          <p className="rounded-xl bg-[var(--loss-soft)] px-3 py-2 text-sm text-[var(--loss)]">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" disabled={busy} className="mt-1 w-full">
          {busy ? "A guardar…" : "Redefinir palavra-passe"}
          {!busy && <ArrowRight className="h-4 w-4" />}
        </Button>
      </form>
    </AuthCard>
  );
}
