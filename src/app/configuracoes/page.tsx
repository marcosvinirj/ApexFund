"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Moon, Sun, User as UserIcon, Save, RotateCcw, Trash2, Check } from "lucide-react";
import { apiSend } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { useTheme } from "@/components/theme-provider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { SectionHeading } from "@/components/ui/stat-card";
import { PageTransition, PageHeader, Skeleton } from "@/components/ui/page";
import { cn } from "@/lib/utils";

export default function ConfiguracoesPage() {
  const router = useRouter();
  const { user, refresh, logout } = useAuth();
  const { theme, toggle } = useTheme();

  const [name, setName] = useState("");
  const [savedName, setSavedName] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [confirm, setConfirm] = useState<null | "reset" | "delete">(null);
  const [busy, setBusy] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  useEffect(() => {
    if (user) setName(user.name);
  }, [user]);

  if (!user) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  async function saveName() {
    setSavingName(true);
    setSavedName(false);
    try {
      await apiSend("/api/account/profile", "PATCH", { name });
      await refresh();
      setSavedName(true);
      setTimeout(() => setSavedName(false), 2500);
    } finally {
      setSavingName(false);
    }
  }

  async function doReset() {
    setBusy(true);
    try {
      await apiSend("/api/account/reset", "POST");
      setConfirm(null);
      setResetDone(true);
      setTimeout(() => setResetDone(false), 3000);
    } finally {
      setBusy(false);
    }
  }

  async function doDelete() {
    setBusy(true);
    try {
      await apiSend("/api/account", "DELETE");
      await logout();
      router.replace("/register");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageTransition>
      <PageHeader
        title="Configurações"
        subtitle="Gere o teu perfil, aparência e dados."
      />

      {/* Profile */}
      <Card>
        <div className="flex flex-col gap-4 p-5">
          <SectionHeading title="Perfil" subtitle="A tua identidade na plataforma" />
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--brand),var(--brand-2))] text-lg font-semibold text-white">
              {user.name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("")}
            </span>
            <div>
              <p className="font-semibold">{user.name}</p>
              <p className="text-sm text-muted-2">{user.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Nome</Label>
              <div className="relative flex items-center">
                <span className="pointer-events-none absolute left-3 text-muted-2">
                  <UserIcon className="h-4 w-4" />
                </span>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="pl-9" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Email</Label>
              <Input value={user.email} disabled className="opacity-60" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={saveName} disabled={savingName || name.trim().length < 2 || name === user.name}>
              <Save className="h-4 w-4" /> {savingName ? "A guardar…" : "Guardar perfil"}
            </Button>
            {savedName && (
              <span className="flex items-center gap-1 text-sm text-[var(--profit)]">
                <Check className="h-4 w-4" /> Guardado
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Appearance */}
      <Card>
        <div className="flex flex-col gap-4 p-5">
          <SectionHeading title="Aparência" subtitle="Escolhe o tema da interface" />
          <div className="grid max-w-sm grid-cols-2 gap-2">
            <ThemeOption active={theme === "dark"} onClick={() => theme !== "dark" && toggle()} icon={<Moon className="h-4 w-4" />} label="Escuro" />
            <ThemeOption active={theme === "light"} onClick={() => theme !== "light" && toggle()} icon={<Sun className="h-4 w-4" />} label="Claro" />
          </div>
        </div>
      </Card>

      {/* Data management */}
      <Card className="border border-[color-mix(in_oklab,var(--loss),transparent_75%)]">
        <div className="flex flex-col gap-4 p-5">
          <SectionHeading title="Gestão de dados" subtitle="Ações irreversíveis — usa com cuidado" />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-[var(--border)] p-4">
            <div>
              <p className="font-medium">Recomeçar do zero</p>
              <p className="text-sm text-muted">Apaga operações, metas e diário, e repõe o plano inicial.</p>
            </div>
            <Button variant="outline" onClick={() => setConfirm("reset")}>
              <RotateCcw className="h-4 w-4" /> Recomeçar
            </Button>
          </div>
          {resetDone && (
            <p className="rounded-xl bg-[var(--profit-soft)] px-3 py-2 text-sm text-[var(--profit)]">
              ✓ Dados repostos. Volta ao Dashboard para veres a conta limpa.
            </p>
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-[color-mix(in_oklab,var(--loss),transparent_70%)] bg-[var(--loss-soft)] p-4">
            <div>
              <p className="font-medium text-[var(--loss)]">Eliminar conta</p>
              <p className="text-sm text-muted">Remove permanentemente a tua conta e todos os dados.</p>
            </div>
            <Button variant="danger" onClick={() => setConfirm("delete")}>
              <Trash2 className="h-4 w-4" /> Eliminar
            </Button>
          </div>
        </div>
      </Card>

      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm === "delete" ? "Eliminar conta?" : "Recomeçar do zero?"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              disabled={busy}
              onClick={confirm === "delete" ? doDelete : doReset}
            >
              {busy ? "A processar…" : confirm === "delete" ? "Sim, eliminar" : "Sim, recomeçar"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          {confirm === "delete"
            ? "Esta ação é permanente. A tua conta, operações, metas e diário serão eliminados e serás desconectado."
            : "Todas as operações, metas e entradas do diário serão apagadas e o plano volta ao estado inicial. Esta ação não pode ser desfeita."}
        </p>
      </Modal>
    </PageTransition>
  );
}

function ThemeOption({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition-colors",
        active
          ? "border-[var(--brand)] bg-[var(--brand-soft)] text-foreground"
          : "border-[var(--border)] text-muted hover:text-foreground",
      )}
    >
      {icon} {label}
    </button>
  );
}
