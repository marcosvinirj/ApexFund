import { NextResponse } from "next/server";
import { consumeEmailToken, markEmailVerified } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as { token?: string };
  const token = body.token?.trim();
  if (!token)
    return NextResponse.json({ error: "Token em falta." }, { status: 400 });

  const userId = await consumeEmailToken(token, "verify");
  if (!userId)
    return NextResponse.json(
      { error: "Link inválido ou expirado. Pede um novo a partir da app." },
      { status: 400 },
    );

  await markEmailVerified(userId);
  return NextResponse.json({ ok: true });
}
