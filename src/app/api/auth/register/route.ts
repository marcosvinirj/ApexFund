import { NextResponse } from "next/server";
import { createEmailToken, createUser, getUserByEmail } from "@/lib/db";
import { hashPassword } from "@/lib/hash";
import { startSession } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import {
  VERIFY_TTL_MS,
  generateToken,
  getBaseUrl,
  sendEmail,
  verificationEmail,
} from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limited = rateLimit(`register:${ip}`, 6, 60 * 60_000); // 6 contas / hora
  if (!limited.ok)
    return NextResponse.json(
      { error: "Demasiados registos. Tenta novamente mais tarde." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );

  const body = (await request.json()) as {
    email?: string;
    name?: string;
    password?: string;
  };
  const email = body.email?.trim().toLowerCase();
  const name = body.name?.trim();
  const password = body.password ?? "";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return NextResponse.json({ error: "Email inválido." }, { status: 400 });
  if (!name || name.length < 2)
    return NextResponse.json({ error: "Indica o teu nome." }, { status: 400 });
  if (password.length < 6)
    return NextResponse.json(
      { error: "A palavra-passe precisa de pelo menos 6 caracteres." },
      { status: 400 },
    );

  if (await getUserByEmail(email))
    return NextResponse.json(
      { error: "Já existe uma conta com este email." },
      { status: 409 },
    );

  const user = await createUser(email, name, hashPassword(password));
  await startSession(user.id);

  // Fire off the email verification link (best-effort — never blocks signup).
  let devLink: string | undefined;
  try {
    const token = generateToken();
    await createEmailToken(user.id, "verify", token, VERIFY_TTL_MS);
    const link = `${getBaseUrl(request)}/verificar-email?token=${token}`;
    const { delivered } = await sendEmail({
      to: user.email,
      ...verificationEmail(user.name, link),
    });
    if (!delivered && process.env.NODE_ENV !== "production") devLink = link;
  } catch (e) {
    console.error("[register] falha ao enviar verificação:", e);
  }

  return NextResponse.json(
    { user, ...(devLink ? { devLink } : {}) },
    { status: 201 },
  );
}
