import { NextResponse } from "next/server";
import {
  consumeEmailToken,
  deleteUserSessions,
  updateUserPassword,
} from "@/lib/db";
import { hashPassword } from "@/lib/hash";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as { token?: string; password?: string };
  const token = body.token?.trim();
  const password = body.password ?? "";

  if (!token)
    return NextResponse.json({ error: "Token em falta." }, { status: 400 });
  if (password.length < 6)
    return NextResponse.json(
      { error: "A palavra-passe precisa de pelo menos 6 caracteres." },
      { status: 400 },
    );

  const userId = await consumeEmailToken(token, "reset");
  if (!userId)
    return NextResponse.json(
      { error: "Link inválido ou expirado. Pede um novo." },
      { status: 400 },
    );

  await updateUserPassword(userId, hashPassword(password));
  // Revoke existing sessions so a leaked session can't outlive the reset.
  await deleteUserSessions(userId);
  return NextResponse.json({ ok: true });
}
