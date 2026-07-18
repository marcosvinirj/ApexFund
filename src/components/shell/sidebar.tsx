"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronLeft, Zap } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function SidebarContent({
  collapsed,
  onNavigate,
  onToggleCollapse,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
  onToggleCollapse?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col gap-2 p-3">
      {/* Brand */}
      <div className="flex items-center gap-3 px-2 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--brand),var(--brand-2))] shadow-lg">
          <Zap className="h-5 w-5 text-white" fill="white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">
              Apex<span className="text-[var(--brand)]">Fund</span>
            </p>
            <p className="truncate text-[11px] text-muted-2">
              Trading & Risk Suite
            </p>
          </div>
        )}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="ml-auto hidden h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-[var(--card-hover)] hover:text-foreground lg:flex"
            aria-label="Recolher menu"
          >
            <ChevronLeft
              className={cn(
                "h-4 w-4 transition-transform",
                collapsed && "rotate-180",
              )}
            />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                active
                  ? "text-foreground"
                  : "text-muted hover:bg-[var(--card)] hover:text-foreground",
                collapsed && "justify-center px-0",
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 -z-10 rounded-xl bg-[var(--brand-soft)] ring-1 ring-inset ring-[color-mix(in_oklab,var(--brand),transparent_60%)]"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <Icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0",
                  active && "text-[var(--brand)]",
                )}
                strokeWidth={2}
              />
              {!collapsed && (
                <>
                  <span className="truncate font-medium">{item.label}</span>
                  {item.badge && (
                    <Badge variant="brand" className="ml-auto px-1.5 py-0.5">
                      {item.badge}
                    </Badge>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer card */}
      {!collapsed && (
        <div className="mt-auto">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
            <p className="text-xs font-medium text-foreground">
              Disciplina &gt; Emoção
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-2">
              Segue o teu plano de gestão de risco em cada operação.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
