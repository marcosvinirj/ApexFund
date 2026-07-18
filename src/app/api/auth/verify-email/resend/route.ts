import { NextResponse } from "next/server";
import { createEmailToken } from "@/lib/db";
import { currentUser, unauthorized } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import {
  VERIFY_TTL_MS,
  generateToken,
  getBaseUrl,
  sendEmail,
  verificationEmail,
} from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  if (user.emailVerified)
    return NextResponse.json({ ok: true, alreadyVerified: true });

  const limited = rateLimit(`verify-resend:${user.id}`, 4, 15 * 60_000);
  if (!limited.ok)
    return NextResponse.json(
      { error: "Aguarda um momento antes de pedir outro email." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );

  const token = generateToken();
  await createEmailToken(user.id, "verify", token, VERIFY_TTL_MS);
  const link = `${getBaseUrl(request)}/verificar-email?token=${token}`;
  const { delivered } = await sendEmail({
    to: user.email,
    ...verificationEmail(user.name, link),
  });
  const devLink =
    !delivered && process.env.NODE_ENV !== "production" ? link : undefined;
  return NextResponse.json({ ok: true, ...(devLink ? { devLink } : {}) });
}
