"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Moon, Sun, Wallet, Target as TargetIcon, LogOut, ChevronDown } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";
import { useApi, type GrowthResponse } from "@/lib/api";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/components/auth-provider";
import { formatCurrency } from "@/lib/utils";

export function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const { data } = useApi<GrowthResponse>("/api/growth");
  const [menuOpen, setMenuOpen] = useState(false);

  const current = NAV_ITEMS.find(
    (n) => pathname === n.href || pathname.startsWith(n.href + "/"),
  );

  const initials = user
    ? user.name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase())
        .join("")
    : "";

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-[var(--border)] bg-[color-mix(in_oklab,var(--background),transparent_20%)] px-4 backdrop-blur-xl sm:px-6">
      <button
        onClick={onOpenMenu}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-[var(--card-hover)] hover:text-foreground lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="min-w-0">
        <h1 className="truncate text-base font-semibold tracking-tight">
          {current?.label ?? "Dashboard"}
        </h1>
        <p className="hidden text-xs text-muted-2 sm:block">
          {new Date().toLocaleDateString("pt-PT", {
            weekday: "long",
            day: "2-digit",
            month: "long",
          })}
        </p>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <div className="hidden items-center gap-2 md:flex">
          <Pill
            icon={<Wallet className="h-4 w-4 text-[var(--profit)]" />}
            label="Capital"
            value={data ? formatCurrency(data.stats.currentCapital) : "—"}
          />
          <Pill
            icon={<TargetIcon className="h-4 w-4 text-[var(--brand)]" />}
            label="Meta Mensal"
            value={data ? formatCurrency(data.monthlyGoal.goal) : "—"}
          />
        </div>

        <button
          onClick={toggle}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)] text-muted transition-colors hover:text-foreground"
          aria-label="Alternar tema"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] py-1 pl-1 pr-2 transition-colors hover:bg-[var(--card-hover)]"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--brand),var(--brand-2))] text-xs font-semibold text-white">
              {initials || "·"}
            </span>
            <span className="hidden max-w-[120px] truncate text-sm font-medium sm:block">
              {user?.name ?? "Conta"}
            </span>
            <ChevronDown className="hidden h-3.5 w-3.5 text-muted-2 sm:block" />
          </button>

          <AnimatePresence>
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="glass-strong absolute right-0 top-12 z-50 w-56 rounded-2xl p-2 shadow-xl"
                >
                  <div className="border-b border-[var(--border)] px-3 py-2">
                    <p className="truncate text-sm font-medium">{user?.name}</p>
                    <p className="truncate text-xs text-muted-2">{user?.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-[var(--loss)] transition-colors hover:bg-[var(--loss-soft)]"
                  >
                    <LogOut className="h-4 w-4" />
                    Terminar sessão
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}

function Pill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-1.5">
      {icon}
      <div className="leading-tight">
        <p className="text-[10px] uppercase tracking-wide text-muted-2">{label}</p>
        <p className="tnum text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}
