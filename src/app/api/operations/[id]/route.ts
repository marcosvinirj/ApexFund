import { NextResponse } from "next/server";
import { deleteOperation, updateOperation } from "@/lib/db";
import type { UpdateOperationInput } from "@/lib/db";
import { currentUser, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const { id } = await params;

  const body = (await request.json()) as Partial<UpdateOperationInput>;
  if (!body.pair || !body.result || body.riskPercent == null) {
    return NextResponse.json(
      { error: "Campos obrigatórios em falta (pair, result, riskPercent)." },
      { status: 400 },
    );
  }

  const op = await updateOperation(user.id, id, {
    date: body.date ?? new Date().toISOString().slice(0, 10),
    pair: body.pair,
    direction: body.direction ?? "long",
    result: body.result,
    riskPercent: Number(body.riskPercent),
    rMultiple: Number(body.rMultiple ?? 0),
    notes: body.notes,
  });
  if (!op)
    return NextResponse.json(
      { error: "Operação não encontrada." },
      { status: 404 },
    );
  return NextResponse.json(op);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  await deleteOperation(user.id, id);
  return NextResponse.json({ ok: true });
}
