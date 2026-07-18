import {
  LayoutDashboard,
  CandlestickChart,
  NotebookPen,
  Target,
  TrendingUp,
  BarChart3,
  FileText,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Operações", href: "/operacoes", icon: CandlestickChart },
  { label: "Diário SMC", href: "/diario", icon: NotebookPen },
  { label: "Metas", href: "/metas", icon: Target },
  {
    label: "Plano de Crescimento",
    href: "/plano",
    icon: TrendingUp,
    badge: "Novo",
  },
  { label: "Estatísticas", href: "/estatisticas", icon: BarChart3 },
  { label: "Relatórios", href: "/relatorios", icon: FileText },
  { label: "Configurações", href: "/configuracoes", icon: Settings },
];
