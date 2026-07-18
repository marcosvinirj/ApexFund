import { NextResponse } from "next/server";
import { computeStats, getPlan, listMilestones, listOperations } from "@/lib/db";
import { currentUser, unauthorized } from "@/lib/auth";
import {
  comparisonStatus,
  computeMonthlyGoal,
  computeProjection,
  weeksSinceStart,
} from "@/lib/growth";

export const dynamic = "force-dynamic";

/**
 * Composite endpoint powering the Growth Plan page and dashboard widgets:
 * plan + projection (with the real curve overlaid) + comparison + milestone
 * progress + the "next milestone" motivation figures.
 */
export async function GET() {
  const user = await currentUser();
  if (!user) return unauthorized();

  const [plan, operations, stats, milestones] = await Promise.all([
    getPlan(user.id),
    listOperations(user.id),
    computeStats(user.id),
    listMilestones(user.id),
  ]);

  const projection = computeProjection(plan, {
    baseCapital: stats.currentCapital,
    operations,
  });

  const nowWeek = weeksSinceStart(plan.startDate);
  const projectedNow =
    projection.points.find((p) => p.index === nowWeek)?.projected ??
    plan.initialCapital;
  const realNow = stats.currentCapital;
  const status = comparisonStatus(realNow, projectedNow);
  const deltaPct = projectedNow > 0 ? (realNow / projectedNow - 1) * 100 : 0;

  const weeklyFactor =
    plan.tradesPerWeek > 0
      ? Math.pow(1 + projection.expectancyPerTrade, plan.tradesPerWeek)
      : 1;

  const milestoneProgress = milestones.map((m) => {
    const reached = realNow >= m.value;
    const progress = Math.min(1, realNow / m.value);
    let weeksAway: number | null = null;
    if (!reached && weeklyFactor > 1 && realNow > 0) {
      weeksAway = Math.ceil(
        Math.log(m.value / realNow) / Math.log(weeklyFactor),
      );
    }
    return { ...m, reached, progress, weeksAway };
  });

  const monthlyGoal = computeMonthlyGoal(plan, realNow, operations);

  const next = milestoneProgress.find((m) => !m.reached) ?? null;
  const nextMilestone = next
    ? {
        label: next.label,
        value: next.value,
        remaining: next.value - realNow,
        weeksAway: next.weeksAway,
        progress: next.progress,
      }
    : null;

  return NextResponse.json({
    plan,
    projection,
    stats,
    milestones: milestoneProgress,
    comparison: { status, realNow, projectedNow, deltaPct, week: nowWeek },
    nextMilestone,
    monthlyGoal,
  });
}
