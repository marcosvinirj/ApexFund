import type {
  GrowthPlan,
  GrowthProjection,
  MonthlyGoalProgress,
  Operation,
  ProjectionPoint,
  ComparisonStatus,
} from "./types";

const MS_WEEK = 7 * 24 * 60 * 60 * 1000;

/**
 * Expectancy per trade, expressed as a fraction of current capital.
 *
 *   EV = p * (risk * RR) - (1 - p) * risk
 *      = risk * (p * (RR + 1) - 1)
 *
 * Risk is taken on *current* capital, so the account compounds: each trade
 * multiplies capital by (1 + EV) on the expected path.
 */
export function expectancyPerTrade(plan: GrowthPlan): number {
  const p = plan.winRate / 100;
  const risk = plan.riskPerTrade / 100;
  return risk * (p * (plan.riskReward + 1) - 1);
}

function addWeeks(startISO: string, weeks: number): string {
  return new Date(new Date(startISO).getTime() + weeks * MS_WEEK)
    .toISOString()
    .slice(0, 10);
}

interface ProjectionOptions {
  /** Capital used to size the "expected profit / period" figures. Defaults to initialCapital. */
  baseCapital?: number;
  /** Real operations, newest-or-oldest order, used to overlay the realized curve. */
  operations?: Operation[];
}

/**
 * Build a full compounded growth projection from a plan.
 *
 * Time-to-target is driven by the weekly cadence (tradesPerWeek) because the
 * projection chart advances week by week; the monthly cadence feeds the
 * monthly / yearly profit figures.
 */
export function computeProjection(
  plan: GrowthPlan,
  opts: ProjectionOptions = {},
): GrowthProjection {
  const ev = expectancyPerTrade(plan);
  const perTradeFactor = 1 + ev;
  const base = opts.baseCapital ?? plan.initialCapital;

  const tpw = Math.max(plan.tradesPerWeek, 0);
  const tpm = Math.max(plan.tradesPerMonth, 0);
  const tradesPerYear = tpm * 12;

  const weeklyFactor = Math.pow(perTradeFactor, tpw);
  const monthlyFactor = Math.pow(perTradeFactor, tpm);
  const yearlyFactor = Math.pow(perTradeFactor, tradesPerYear);

  const weeklyGrowthPct = (weeklyFactor - 1) * 100;
  const monthlyGrowthPct = (monthlyFactor - 1) * 100;
  const yearlyGrowthPct = (yearlyFactor - 1) * 100;

  const reachable =
    perTradeFactor > 1 &&
    tpw > 0 &&
    plan.targetCapital > plan.initialCapital &&
    plan.initialCapital > 0;

  // Trades needed: C0 * f^n = T  ->  n = ln(T/C0) / ln(f)
  let tradesToTarget: number | null = null;
  let weeksToTarget: number | null = null;
  let monthsToTarget: number | null = null;
  let targetDate: string | null = null;

  if (reachable) {
    tradesToTarget = Math.ceil(
      Math.log(plan.targetCapital / plan.initialCapital) /
        Math.log(perTradeFactor),
    );
    weeksToTarget = tradesToTarget / tpw;
    monthsToTarget = weeksToTarget / (52 / 12);
    targetDate = addWeeks(plan.startDate, Math.ceil(weeksToTarget));
  }

  // Weekly projected curve.
  const horizonWeeks = reachable
    ? clampInt(Math.ceil(weeksToTarget!) + 2, 8, 520)
    : 104;

  const realSeries = opts.operations
    ? buildRealSeries(opts.operations, plan, horizonWeeks)
    : null;

  const points: ProjectionPoint[] = [];
  let projected = plan.initialCapital;
  const nowWeek = weeksSinceStart(plan.startDate);

  for (let i = 0; i <= horizonWeeks; i++) {
    points.push({
      index: i,
      weekLabel: `S${i}`,
      date: addWeeks(plan.startDate, i),
      projected: round2(projected) ?? projected,
      real:
        realSeries && i <= nowWeek ? round2(realSeries[i] ?? null) : undefined,
    });
    projected *= weeklyFactor;
  }

  return {
    points,
    expectancyPerTrade: ev,
    weeklyGrowthPct,
    monthlyGrowthPct,
    yearlyGrowthPct,
    expectedProfitWeek: base * (weeklyFactor - 1),
    expectedProfitMonth: base * (monthlyFactor - 1),
    expectedProfitYear: base * (yearlyFactor - 1),
    tradesToTarget,
    weeksToTarget,
    monthsToTarget,
    targetDate,
    reachable,
    finalProjected: points[points.length - 1]?.projected ?? plan.initialCapital,
  };
}

/**
 * Build the realized capital at the end of each week from real operations,
 * carrying the last known balance forward through quiet weeks.
 */
function buildRealSeries(
  operations: Operation[],
  plan: GrowthPlan,
  horizonWeeks: number,
): (number | null)[] {
  const sorted = [...operations].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const start = new Date(plan.startDate).getTime();
  const series: (number | null)[] = new Array(horizonWeeks + 1).fill(null);

  let balance = plan.initialCapital;
  let lastWeek = 0;
  series[0] = balance;

  for (const op of sorted) {
    const week = Math.floor((new Date(op.date).getTime() - start) / MS_WEEK);
    if (week < 0 || week > horizonWeeks) continue;
    // carry forward previous balance to any skipped weeks
    for (let w = lastWeek + 1; w < week; w++) series[w] = balance;
    balance = op.balanceAfter;
    series[week] = balance;
    lastWeek = Math.max(lastWeek, week);
  }
  // carry the final known balance up to "now"
  const now = weeksSinceStart(plan.startDate);
  for (let w = lastWeek + 1; w <= Math.min(now, horizonWeeks); w++) {
    series[w] = balance;
  }
  return series;
}

/** Where the real curve sits vs the projected curve, with a tolerance band. */
export function comparisonStatus(
  real: number,
  projected: number,
  tolerance = 0.05,
): ComparisonStatus {
  if (projected <= 0) return "on-track";
  const ratio = real / projected;
  if (ratio >= 1 + tolerance) return "above";
  if (ratio <= 1 - tolerance) return "below";
  return "on-track";
}

/**
 * Progress toward the plan's monthly goal, using the same expectancy-based
 * compounding math as computeProjection — scoped to the current calendar
 * month instead of the overall target.
 */
export function computeMonthlyGoal(
  plan: GrowthPlan,
  currentCapital: number,
  operations: Operation[],
): MonthlyGoalProgress {
  const ev = expectancyPerTrade(plan);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysElapsed = now.getDate();
  const daysRemaining = Math.max(0, daysInMonth - daysElapsed);

  const monthPnl = operations
    .filter((o) => {
      const d = new Date(o.date);
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .reduce((sum, o) => sum + o.pnl, 0);

  const goal = plan.monthlyGoal;
  const remaining = Math.max(0, goal - monthPnl);
  const reached = goal > 0 && monthPnl >= goal;
  const progress = goal > 0 ? monthPnl / goal : 0;

  // Trades needed to close the remaining gap, compounding from current capital.
  let tradesToGoal: number | null = null;
  if (!reached && ev > 0 && currentCapital > 0 && remaining > 0) {
    tradesToGoal = Math.ceil(
      Math.log((currentCapital + remaining) / currentCapital) /
        Math.log(1 + ev),
    );
  }

  const tradesPerDay = Math.max(plan.tradesPerWeek, 0) / 7;
  const reachableInMonth =
    reached ||
    (tradesToGoal != null && tradesToGoal <= tradesPerDay * daysRemaining);

  // Expected additional trades left in the month, applied at the current pace.
  const expectedRemainingTrades = tradesPerDay * daysRemaining;
  const projectedFactor = Math.pow(1 + ev, expectedRemainingTrades);
  const projectedMonthEndPnl =
    monthPnl + currentCapital * (projectedFactor - 1);

  const status: ComparisonStatus =
    goal <= 0
      ? "on-track"
      : !reachableInMonth
        ? "below"
        : projectedMonthEndPnl >= goal * 1.05
          ? "above"
          : "on-track";

  return {
    goal,
    monthLabel: now.toLocaleDateString("pt-PT", {
      month: "long",
      year: "numeric",
    }),
    monthPnl,
    remaining,
    progress,
    reached,
    daysElapsed,
    daysInMonth,
    daysRemaining,
    tradesToGoal,
    reachableInMonth,
    projectedMonthEndPnl,
    status,
  };
}

export function weeksSinceStart(startISO: string): number {
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(startISO).getTime()) / MS_WEEK),
  );
}

function round2(v: number | null): number | null {
  if (v === null || !Number.isFinite(v)) return null;
  return Math.round(v * 100) / 100;
}

function clampInt(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(v)));
}
