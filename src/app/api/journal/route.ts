import { NextResponse } from "next/server";
import { createJournal, listJournal, type JournalInput } from "@/lib/db";
import { currentUser, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return unauthorized();
  return NextResponse.json(await listJournal(user.id));
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();

  const body = (await request.json()) as Partial<JournalInput>;
  if (!body.title?.trim())
    return NextResponse.json({ error: "O título é obrigatório." }, { status: 400 });

  const entry = await createJournal(user.id, {
    date: body.date,
    title: body.title.trim(),
    pair: body.pair?.trim() || undefined,
    bias: body.bias ?? "neutral",
    tags: Array.isArray(body.tags) ? body.tags : [],
    notes: body.notes ?? "",
    rating: Number(body.rating ?? 3),
  });
  return NextResponse.json(entry, { status: 201 });
}
