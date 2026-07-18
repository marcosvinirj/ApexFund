"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";
import { SidebarContent } from "./sidebar";
import { Topbar } from "./topbar";
import { VerifyEmailBanner } from "./verify-email-banner";

// Login / register: bounce to dashboard once authenticated.
const AUTH_ROUTES = ["/login", "/register"];
// Standalone flows reachable without a session (and without bouncing).
const PUBLIC_ROUTES = ["/recuperar-senha", "/redefinir-senha", "/verificar-email"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const isAuthRoute = AUTH_ROUTES.includes(pathname);
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    if (user === undefined) return; // still loading
    if (isPublicRoute) return; // no gating on public flows
    if (!isAuthRoute && user === null) router.replace("/login");
    if (isAuthRoute && user) router.replace("/dashboard");
  }, [user, isAuthRoute, isPublicRoute, router]);

  // Auth + public pages render full-bleed (no sidebar/topbar).
  if (isAuthRoute || isPublicRoute) return <>{children}</>;

  // Gate app routes until we know who the user is.
  if (user === undefined || user === null) return <Splash />;

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 border-r border-[var(--border)] bg-[color-mix(in_oklab,var(--background),transparent_40%)] backdrop-blur-xl transition-[width] duration-300 lg:block",
          collapsed ? "w-[76px]" : "w-[264px]",
        )}
      >
        <SidebarContent
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
        />
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 40 }}
              className="fixed inset-y-0 left-0 z-50 w-[280px] border-r border-[var(--border)] bg-[var(--background-2)] lg:hidden"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute right-3 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-[var(--card-hover)]"
                aria-label="Fechar menu"
              >
                <X className="h-5 w-5" />
              </button>
              <SidebarContent
                collapsed={false}
                onNavigate={() => setMobileOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenMenu={() => setMobileOpen(true)} />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <VerifyEmailBanner />
          {children}
        </main>
      </div>
    </div>
  );
}

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--brand),var(--brand-2))] shadow-xl">
          <Zap className="h-7 w-7 text-white" fill="white" />
        </div>
        <p className="text-sm text-muted">A carregar…</p>
      </motion.div>
    </div>
  );
}
