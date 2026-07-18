import type { Operation } from "./types";

export interface EquityPoint {
  date: string;
  balance: number;
  peak: number;
  drawdownPct: number; // <= 0
}

export interface RBucket {
  label: string;
  value: number;
  color: string;
}

export interface GroupStat {
  key: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  pnl: number;
  avgR: number;
  profitFactor: number;
}

export interface Streaks {
  longestWin: number;
  longestLoss: number;
  current: number;
  currentType: "win" | "loss" | "none";
}

export interface AnalyticsResult {
  summary: {
    totalTrades: number;
    winRate: number;
    profitFactor: number;
    expectancyR: number;
    avgWinR: number;
    avgLossR: number;
    totalR: number;
    maxDrawdownPct: number;
    maxDrawdownDurationDays: number;
    recovered: boolean;
    currentDrawdownPct: number;
  };
  equity: EquityPoint[];
  rDistribution: RBucket[];
  byPair: GroupStat[];
  byDirection: GroupStat[];
  byWeekday: { label: string; value: number }[];
  streaks: Streaks;
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function computeAnalytics(
  operations: Operation[],
  initialCapital: number,
): AnalyticsResult {
  const ops = [...operations].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  /* ---- Equity curve + drawdown ---- */
  const equity: EquityPoint[] = [];
  let peak = initialCapital;
  let peakDate = ops[0]?.date ?? new Date().toISOString().slice(0, 10);
  let maxDD = 0;
  let maxDDDurationDays = 0;
  let troughDateOfMaxDD = peakDate;

  equity.push({
    date: peakDate,
    balance: initialCapital,
    peak,
    drawdownPct: 0,
  });

  for (const op of ops) {
    if (op.balanceAfter >= peak) {
      peak = op.balanceAfter;
      peakDate = op.date;
    }
    const dd = peak > 0 ? ((op.balanceAfter - peak) / peak) * 100 : 0;
    if (dd < maxDD) {
      maxDD = dd;
      troughDateOfMaxDD = op.date;
      maxDDDurationDays = daysBetween(peakDate, op.date);
    }
    equity.push({
      date: op.date,
      balance: op.balanceAfter,
      peak,
      drawdownPct: dd,
    });
  }

  const lastBalance = ops.length ? ops[ops.length - 1].balanceAfter : initialCapital;
  const currentDrawdownPct = peak > 0 ? ((lastBalance - peak) / peak) * 100 : 0;
  // "recovered" if, after the worst trough, equity made a new peak.
  const recovered = ops.some(
    (o) => new Date(o.date) > new Date(troughDateOfMaxDD) && o.balanceAfter >= peak,
  );

  /* ---- R distribution ---- */
  const buckets = [
    { label: "≤ -1R", test: (r: number) => r <= -1, color: "var(--loss)" },
    { label: "-1–0R", test: (r: number) => r > -1 && r < 0, color: "var(--loss)" },
    { label: "0R (BE)", test: (r: number) => r === 0, color: "var(--muted-2)" },
    { label: "1–2R", test: (r: number) => r > 0 && r < 2, color: "var(--profit)" },
    { label: "2–3R", test: (r: number) => r >= 2 && r < 3, color: "var(--profit)" },
    { label: "3–4R", test: (r: number) => r >= 3 && r < 4, color: "var(--profit)" },
    { label: "4R+", test: (r: number) => r >= 4, color: "var(--brand)" },
  ];
  const rDistribution: RBucket[] = buckets
    .map((b) => ({
      label: b.label,
      color: b.color,
      value: ops.filter((o) => b.test(o.rMultiple)).length,
    }))
    .filter((b) => b.value > 0);

  /* ---- Grouped stats ---- */
  const byPair = groupStats(ops, (o) => o.pair).sort((a, b) => b.pnl - a.pnl);
  const byDirection = groupStats(ops, (o) =>
    o.direction === "long" ? "Long" : "Short",
  );

  const weekdayPnl = new Array(7).fill(0);
  for (const o of ops) weekdayPnl[new Date(o.date).getDay()] += o.pnl;
  const byWeekday = [1, 2, 3, 4, 5, 6, 0].map((d) => ({
    label: WEEKDAYS[d],
    value: Math.round(weekdayPnl[d]),
  }));

  /* ---- Streaks ---- */
  const streaks = computeStreaks(ops);

  /* ---- Summary ---- */
  const wins = ops.filter((o) => o.result === "win");
  const losses = ops.filter((o) => o.result === "loss");
  const decided = wins.length + losses.length;
  const grossProfit = ops.filter((o) => o.pnl > 0).reduce((s, o) => s + o.pnl, 0);
  const grossLoss = Math.abs(
    ops.filter((o) => o.pnl < 0).reduce((s, o) => s + o.pnl, 0),
  );
  const totalR = ops.reduce((s, o) => s + o.rMultiple, 0);

  return {
    summary: {
      totalTrades: ops.length,
      winRate: decided ? (wins.length / decided) * 100 : 0,
      profitFactor: grossLoss ? grossProfit / grossLoss : grossProfit > 0 ? 99 : 0,
      expectancyR: ops.length ? totalR / ops.length : 0,
      avgWinR: wins.length
        ? wins.reduce((s, o) => s + o.rMultiple, 0) / wins.length
        : 0,
      avgLossR: losses.length
        ? losses.reduce((s, o) => s + o.rMultiple, 0) / losses.length
        : 0,
      totalR,
      maxDrawdownPct: maxDD,
      maxDrawdownDurationDays: maxDDDurationDays,
      recovered,
      currentDrawdownPct,
    },
    equity,
    rDistribution,
    byPair,
    byDirection,
    byWeekday,
    streaks,
  };
}

function groupStats(
  ops: Operation[],
  keyFn: (o: Operation) => string,
): GroupStat[] {
  const map = new Map<string, Operation[]>();
  for (const o of ops) {
    const k = keyFn(o);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(o);
  }
  return [...map.entries()].map(([key, list]) => {
    const wins = list.filter((o) => o.result === "win").length;
    const losses = list.filter((o) => o.result === "loss").length;
    const decided = wins + losses;
    const gp = list.filter((o) => o.pnl > 0).reduce((s, o) => s + o.pnl, 0);
    const gl = Math.abs(
      list.filter((o) => o.pnl < 0).reduce((s, o) => s + o.pnl, 0),
    );
    return {
      key,
      trades: list.length,
      wins,
      losses,
      winRate: decided ? (wins / decided) * 100 : 0,
      pnl: list.reduce((s, o) => s + o.pnl, 0),
      avgR: list.reduce((s, o) => s + o.rMultiple, 0) / list.length,
      profitFactor: gl ? gp / gl : gp > 0 ? 99 : 0,
    };
  });
}

function computeStreaks(ops: Operation[]): Streaks {
  let longestWin = 0;
  let longestLoss = 0;
  let run = 0;
  let runType: "win" | "loss" | "none" = "none";
  for (const o of ops) {
    if (o.result === "breakeven") {
      run = 0;
      runType = "none";
      continue;
    }
    if (o.result === runType) {
      run++;
    } else {
      run = 1;
      runType = o.result;
    }
    if (runType === "win") longestWin = Math.max(longestWin, run);
    if (runType === "loss") longestLoss = Math.max(longestLoss, run);
  }
  return { longestWin, longestLoss, current: run, currentType: runType };
}

function daysBetween(a: string, b: string) {
  return Math.round(
    Math.abs(new Date(b).getTime() - new Date(a).getTime()) / 86_400_000,
  );
}
