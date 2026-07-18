import { NextResponse } from "next/server";
import { resetUserData } from "@/lib/db";
import { currentUser, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await currentUser();
  if (!user) return unauthorized();
  await resetUserData(user.id);
  return NextResponse.json({ ok: true });
}
