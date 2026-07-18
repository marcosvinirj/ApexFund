import { NextResponse } from "next/server";
import { deleteJournal, updateJournal, type JournalInput } from "@/lib/db";
import { currentUser, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const body = (await request.json()) as Partial<JournalInput>;
  if (!body.title?.trim())
    return NextResponse.json({ error: "O título é obrigatório." }, { status: 400 });

  await updateJournal(user.id, id, {
    date: body.date,
    title: body.title.trim(),
    pair: body.pair?.trim() || undefined,
    bias: body.bias ?? "neutral",
    tags: Array.isArray(body.tags) ? body.tags : [],
    notes: body.notes ?? "",
    rating: Number(body.rating ?? 3),
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  await deleteJournal(user.id, id);
  return NextResponse.json({ ok: true });
}
