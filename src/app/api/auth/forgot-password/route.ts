import { NextResponse } from "next/server";
import { createEmailToken, getUserByEmail } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import {
  RESET_TTL_MS,
  generateToken,
  getBaseUrl,
  resetEmail,
  sendEmail,
} from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limited = rateLimit(`forgot:${ip}`, 5, 15 * 60_000); // 5 pedidos / 15 min
  if (!limited.ok)
    return NextResponse.json(
      { error: "Demasiados pedidos. Tenta novamente mais tarde." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );

  const body = (await request.json()) as { email?: string };
  const email = body.email?.trim().toLowerCase();
  if (!email)
    return NextResponse.json({ error: "Indica o teu email." }, { status: 400 });

  const user = await getUserByEmail(email);
  let devLink: string | undefined;
  if (user) {
    const token = generateToken();
    await createEmailToken(user.id, "reset", token, RESET_TTL_MS);
    const link = `${getBaseUrl(request)}/redefinir-senha?token=${token}`;
    const { delivered } = await sendEmail({
      to: user.email,
      ...resetEmail(user.name, link),
    });
    // With no email provider (local MVP), surface the link so the flow works.
    if (!delivered && process.env.NODE_ENV !== "production") devLink = link;
  }

  // Always report success so we never reveal whether an email is registered.
  return NextResponse.json({ ok: true, ...(devLink ? { devLink } : {}) });
}
