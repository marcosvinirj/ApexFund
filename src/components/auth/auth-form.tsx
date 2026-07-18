"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Zap, Mail, Lock, User as UserIcon, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const { login, register } = useAuth();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isLogin = mode === "login";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (isLogin) await login(email, password);
      else await register(email, name, password);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocorreu um erro.");
      setBusy(false);
    }
  }

  function useDemo() {
    setEmail("demo@apexfund.app");
    setPassword("demo1234");
  }

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
          <h1 className="text-2xl font-semibold tracking-tight">
            {isLogin ? "Bem-vindo de volta" : "Cria a tua conta"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {isLogin
              ? "Entra para gerir a tua banca e plano de crescimento."
              : "Começa a acompanhar o teu trading em segundos."}
          </p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          {!isLogin && (
            <FormField
              label="Nome"
              icon={<UserIcon className="h-4 w-4" />}
              type="text"
              placeholder="O teu nome"
              value={name}
              onChange={setName}
              autoComplete="name"
            />
          )}
          <FormField
            label="Email"
            icon={<Mail className="h-4 w-4" />}
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={setEmail}
            autoComplete="email"
          />
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label>Palavra-passe</Label>
              {isLogin && (
                <Link
                  href="/recuperar-senha"
                  className="text-xs font-medium text-[var(--brand)] hover:underline"
                >
                  Esqueceste-te?
                </Link>
              )}
            </div>
            <div className="relative flex items-center">
              <span className="pointer-events-none absolute left-3 text-muted-2">
                <Lock className="h-4 w-4" />
              </span>
              <Input
                type={showPw ? "text" : "password"}
                placeholder={isLogin ? "••••••••" : "Mínimo 6 caracteres"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isLogin ? "current-password" : "new-password"}
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
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-[var(--loss-soft)] px-3 py-2 text-sm text-[var(--loss)]"
            >
              {error}
            </motion.p>
          )}

          <Button type="submit" size="lg" disabled={busy} className="mt-1 w-full">
            {busy
              ? "A processar…"
              : isLogin
                ? "Entrar"
                : "Criar conta"}
            {!busy && <ArrowRight className="h-4 w-4" />}
          </Button>
        </form>

        {isLogin && (
          <button
            onClick={useDemo}
            className="mt-3 w-full rounded-xl border border-dashed border-[var(--border-strong)] px-3 py-2 text-xs text-muted transition-colors hover:bg-[var(--card)] hover:text-foreground"
          >
            Experimentar com a conta demo (preenche automaticamente)
          </button>
        )}

        <p className="mt-6 text-center text-sm text-muted">
          {isLogin ? "Ainda não tens conta? " : "Já tens conta? "}
          <Link
            href={isLogin ? "/register" : "/login"}
            className="font-medium text-[var(--brand)] hover:underline"
          >
            {isLogin ? "Regista-te" : "Entra"}
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

function FormField({
  label,
  icon,
  value,
  onChange,
  ...props
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <div className="relative flex items-center">
        <span className="pointer-events-none absolute left-3 text-muted-2">
          {icon}
        </span>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-9"
          {...props}
        />
      </div>
    </div>
  );
}
