"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { AuthCard } from "@/components/auth/auth-card";

export default function VerificarEmailPage() {
  return (
    <Suspense fallback={<AuthCard title="A verificar…">{null}</AuthCard>}>
      <VerifyRunner />
    </Suspense>
  );
}

function VerifyRunner() {
  const token = useSearchParams().get("token") ?? "";
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // guard against double-run in strict mode
    ran.current = true;

    if (!token) {
      setStatus("error");
      setMessage("Este link de verificação está incompleto.");
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Não foi possível verificar.");
        setStatus("ok");
      } catch (err) {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Não foi possível verificar.");
      }
    })();
  }, [token]);

  if (status === "loading") {
    return (
      <AuthCard title="A verificar o teu email" subtitle="Um momento…">
        <div className="flex justify-center py-2">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--brand)]" />
        </div>
      </AuthCard>
    );
  }

  if (status === "ok") {
    return (
      <AuthCard
        title="Email confirmado"
        subtitle="A tua conta está agora totalmente ativa."
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--profit-soft)]">
            <CheckCircle2 className="h-7 w-7 text-[var(--profit)]" />
          </div>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-[var(--brand)] hover:underline"
          >
            Ir para o Dashboard
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Não foi possível verificar" subtitle={message}>
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--loss-soft)]">
          <XCircle className="h-7 w-7 text-[var(--loss)]" />
        </div>
        <p className="text-sm text-muted">
          Podes pedir um novo link de verificação a partir do Dashboard.
        </p>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-[var(--brand)] hover:underline"
        >
          Voltar ao Dashboard
        </Link>
      </div>
    </AuthCard>
  );
}
