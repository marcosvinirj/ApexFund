import { NextResponse } from "next/server";
import { updateUserName } from "@/lib/db";
import { currentUser, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const body = (await request.json()) as { name?: string };
  const name = body.name?.trim();
  if (!name || name.length < 2)
    return NextResponse.json({ error: "Nome inválido." }, { status: 400 });
  const updated = await updateUserName(user.id, name);
  return NextResponse.json({ user: updated });
}
