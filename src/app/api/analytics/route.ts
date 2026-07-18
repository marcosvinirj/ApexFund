import { NextResponse } from "next/server";
import { getPlan, listOperations } from "@/lib/db";
import { computeAnalytics } from "@/lib/analytics";
import { currentUser, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return unauthorized();
  const [ops, plan] = await Promise.all([
    listOperations(user.id),
    getPlan(user.id),
  ]);
  return NextResponse.json(computeAnalytics(ops, plan.initialCapital));
}
