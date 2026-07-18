import { NextResponse } from "next/server";
import { createMilestone, listMilestones } from "@/lib/db";
import { currentUser, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return unauthorized();
  return NextResponse.json(await listMilestones(user.id));
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();

  const body = (await request.json()) as { label?: string; value?: number };
  if (body.value == null || !Number.isFinite(Number(body.value))) {
    return NextResponse.json({ error: "Valor inválido." }, { status: 400 });
  }
  const value = Number(body.value);
  const label =
    body.label?.trim() ||
    new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(value);
  return NextResponse.json(await createMilestone(user.id, label, value), {
    status: 201,
  });
}
