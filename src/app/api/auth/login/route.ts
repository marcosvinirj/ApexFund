import { NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/db";
import { verifyPassword } from "@/lib/hash";
import { startSession } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limited = rateLimit(`login:${ip}`, 10, 60_000); // 10 tentativas / minuto
  if (!limited.ok)
    return NextResponse.json(
      { error: "Demasiadas tentativas. Aguarda um momento e tenta de novo." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );

  const body = (await request.json()) as { email?: string; password?: string };
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";

  if (!email || !password)
    return NextResponse.json(
      { error: "Email e palavra-passe são obrigatórios." },
      { status: 400 },
    );

  const record = await getUserByEmail(email);
  if (!record || !verifyPassword(password, record.passwordHash))
    return NextResponse.json(
      { error: "Credenciais inválidas." },
      { status: 401 },
    );

  await startSession(record.id);
  const { passwordHash: _ph, ...user } = record;
  void _ph;
  return NextResponse.json({ user });
}
