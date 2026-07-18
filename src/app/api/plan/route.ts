import { NextResponse } from "next/server";
import { getPlan, updatePlan } from "@/lib/db";
import { currentUser, unauthorized } from "@/lib/auth";
import type { GrowthPlan } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return unauthorized();
  return NextResponse.json(await getPlan(user.id));
}

export async function PATCH(request: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();

  const body = (await request.json()) as Partial<GrowthPlan>;
  const allowed: (keyof GrowthPlan)[] = [
    "initialCapital",
    "targetCapital",
    "monthlyGoal",
    "riskPerTrade",
    "riskReward",
    "winRate",
    "tradesPerWeek",
    "tradesPerMonth",
    "startDate",
  ];
  const patch: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) patch[k] = body[k];

  // Enforce the spec's minimum 3:1 risk-reward.
  if (typeof patch.riskReward === "number" && patch.riskReward < 3) {
    patch.riskReward = 3;
  }
  return NextResponse.json(await updatePlan(user.id, patch));
}
