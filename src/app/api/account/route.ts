import { NextResponse } from "next/server";
import { deleteUser } from "@/lib/db";
import { currentUser, endSession, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function DELETE() {
  const user = await currentUser();
  if (!user) return unauthorized();
  await endSession();
  await deleteUser(user.id);
  return NextResponse.json({ ok: true });
}
