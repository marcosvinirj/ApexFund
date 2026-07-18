/** Shared domain types used across the API and UI. */

export interface User {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  createdAt: string;
}

export type EmailTokenType = "verify" | "reset";

export type JournalBias = "bullish" | "bearish" | "neutral";

export interface JournalEntry {
  id: string;
  date: string;
  title: string;
  pair?: string;
  bias: JournalBias;
  tags: string[];
  notes: string;
  rating: number; // 1..5
  createdAt: string;
}

export type OperationResult = "win" | "loss" | "breakeven";

export interface Operation {
  id: string;
  /** ISO date (yyyy-mm-dd) the trade was closed. */
  date: string;
  pair: string;
  /** long | short */
  direction: "long" | "short";
  result: OperationResult;
  /** Risk taken on the trade, as % of capital at that moment. */
  riskPercent: number;
  /** Realized risk-reward achieved (e.g. 3 means +3R, -1 for a full loss). */
  rMultiple: number;
  /** Realized P&L in currency. */
  pnl: number;
  /** Capital after this operation settled. */
  balanceAfter: number;
  notes?: string;
  createdAt: string;
}

export interface GrowthPlan {
  id: string;
  initialCapital: number;
  targetCapital: number;
  /** Manual profit target (in currency) for the current calendar month. */
  monthlyGoal: number;
  riskPerTrade: number; // %
  riskReward: number; // e.g. 3 for 3:1
  winRate: number; // %
  tradesPerWeek: number;
  tradesPerMonth: number;
  startDate: string; // ISO
  updatedAt: string;
}

export interface Milestone {
  id: string;
  label: string;
  value: number;
  /** true for the built-in default milestones. */
  isDefault: boolean;
}

/** A single point on the projected growth curve. */
export interface ProjectionPoint {
  index: number; // week index
  weekLabel: string;
  date: string; // ISO
  projected: number;
  /** Present only up to "today" when real data is overlaid. */
  real?: number | null;
}

export interface GrowthProjection {
  points: ProjectionPoint[];
  expectancyPerTrade: number; // fraction of capital, e.g. 0.02
  weeklyGrowthPct: number;
  monthlyGrowthPct: number;
  yearlyGrowthPct: number;
  expectedProfitWeek: number;
  expectedProfitMonth: number;
  expectedProfitYear: number;
  /** Trades / weeks / months needed to reach the target. null if unreachable. */
  tradesToTarget: number | null;
  weeksToTarget: number | null;
  monthsToTarget: number | null;
  targetDate: string | null;
  reachable: boolean;
  finalProjected: number;
}

export type ComparisonStatus = "above" | "on-track" | "below";

/** Progress of the current calendar month against the plan's monthly goal. */
export interface MonthlyGoalProgress {
  goal: number;
  monthLabel: string;
  monthPnl: number;
  remaining: number;
  progress: number; // monthPnl / goal, can exceed 1
  reached: boolean;
  daysElapsed: number;
  daysInMonth: number;
  daysRemaining: number;
  /** Trades needed (compounding from current capital) to close the gap. null if goal already met or unreachable. */
  tradesToGoal: number | null;
  reachableInMonth: boolean;
  projectedMonthEndPnl: number;
  status: ComparisonStatus;
}

export interface PerformanceStats {
  initialCapital: number;
  currentCapital: number;
  totalPnl: number;
  totalReturnPct: number;
  dailyPnl: number;
  weeklyPnl: number;
  monthlyPnl: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  wins: number;
  losses: number;
  avgWin: number;
  avgLoss: number;
  bestTrade: number;
  worstTrade: number;
}
