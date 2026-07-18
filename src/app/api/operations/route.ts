import { NextResponse } from "next/server";
import { createOperation, listOperations } from "@/lib/db";
import type { NewOperationInput } from "@/lib/db";
import { currentUser, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return unauthorized();
  return NextResponse.json(await listOperations(user.id));
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();

  const body = (await request.json()) as Partial<NewOperationInput>;
  if (!body.pair || !body.result || body.riskPercent == null) {
    return NextResponse.json(
      { error: "Campos obrigatórios em falta (pair, result, riskPercent)." },
      { status: 400 },
    );
  }

  const op = await createOperation(user.id, {
    date: body.date,
    pair: body.pair,
    direction: body.direction ?? "long",
    result: body.result,
    riskPercent: Number(body.riskPercent),
    rMultiple: Number(body.rMultiple ?? 0),
    notes: body.notes,
  });
  return NextResponse.json(op, { status: 201 });
}
