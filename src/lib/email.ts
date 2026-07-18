import { randomBytes } from "node:crypto";

/**
 * Email delivery.
 *
 * If `RESEND_API_KEY` is set, transactional emails go out via the Resend HTTP
 * API (no extra dependency — just fetch). With no provider configured (local
 * MVP / dev), the message is logged to the server console instead, and the
 * calling route may surface the link directly so the flow stays testable.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY?.trim();
const EMAIL_FROM =
  process.env.EMAIL_FROM?.trim() || "ApexFund <onboarding@resend.dev>";

export const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas
export const RESET_TTL_MS = 60 * 60 * 1000; // 1 hora

/** True when a real email provider is configured. */
export function emailProviderConfigured(): boolean {
  return Boolean(RESEND_API_KEY);
}

/** High-entropy URL-safe token for verification / reset links. */
export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

/** Base URL used to build links in emails (APP_URL, else the request origin). */
export function getBaseUrl(request: Request): string {
  const configured = process.env.APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  const origin = request.headers.get("origin");
  if (origin) return origin.replace(/\/+$/, "");
  const host = request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

interface SendResult {
  delivered: boolean;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendResult> {
  if (!RESEND_API_KEY) {
    console.info(
      `\n[email:dev] Sem provedor configurado — email não enviado.\n` +
        `[email:dev] Para: ${opts.to}\n` +
        `[email:dev] Assunto: ${opts.subject}\n` +
        `[email:dev] ${opts.text}\n`,
    );
    return { delivered: false };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      }),
    });
    if (!res.ok) {
      console.error(
        "[email] Resend falhou:",
        res.status,
        await res.text().catch(() => ""),
      );
      return { delivered: false };
    }
    return { delivered: true };
  } catch (e) {
    console.error("[email] erro ao enviar:", e);
    return { delivered: false };
  }
}

/* ------------------------------------------------------------------ */
/*  Templates                                                          */
/* ------------------------------------------------------------------ */

export function verificationEmail(name: string, link: string) {
  const subject = "Confirma o teu email — ApexFund";
  const text =
    `Olá ${name},\n\n` +
    `Obrigado por te registares na ApexFund. Confirma o teu email através do link:\n${link}\n\n` +
    `O link expira em 24 horas. Se não foste tu, ignora este email.`;
  const html = wrap(
    "Confirma o teu email",
    `<p>Olá ${escapeHtml(name)}, obrigado por te registares na <strong>ApexFund</strong>.</p>
     <p>Confirma o teu endereço de email para garantires o acesso e a recuperação da conta.</p>
     <p style="text-align:center;margin:28px 0">
       <a class="btn" href="${link}">Confirmar email</a>
     </p>
     <p class="muted">O link expira em 24 horas. Se não foste tu, podes ignorar este email.</p>`,
  );
  return { subject, text, html };
}

export function resetEmail(name: string, link: string) {
  const subject = "Redefinir palavra-passe — ApexFund";
  const text =
    `Olá ${name},\n\n` +
    `Recebemos um pedido para redefinir a tua palavra-passe. Usa o link:\n${link}\n\n` +
    `O link expira em 1 hora. Se não foste tu, ignora este email — a tua palavra-passe atual continua válida.`;
  const html = wrap(
    "Redefinir palavra-passe",
    `<p>Olá ${escapeHtml(name)}, recebemos um pedido para redefinir a tua palavra-passe.</p>
     <p style="text-align:center;margin:28px 0">
       <a class="btn" href="${link}">Redefinir palavra-passe</a>
     </p>
     <p class="muted">O link expira em 1 hora. Se não foste tu, ignora este email — a tua palavra-passe atual continua válida.</p>`,
  );
  return { subject, text, html };
}

function wrap(title: string, body: string): string {
  return `<!doctype html>
<html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#0b0f19;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#e5e9f0">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px">
    <div style="background:#141a29;border:1px solid #232a3b;border-radius:20px;padding:32px">
      <div style="font-size:20px;font-weight:700;letter-spacing:-.01em;margin-bottom:20px">
        ⚡ ApexFund
      </div>
      <h1 style="font-size:20px;font-weight:600;margin:0 0 12px">${escapeHtml(title)}</h1>
      ${body}
    </div>
    <p style="text-align:center;color:#6b7590;font-size:12px;margin-top:20px">
      ApexFund — Trading &amp; Risk Suite
    </p>
  </div>
  <style>
    .btn{display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;
      text-decoration:none;padding:12px 24px;border-radius:12px;font-weight:600;font-size:14px}
    .muted{color:#8b93a7;font-size:13px;line-height:1.5}
    p{line-height:1.6;font-size:14px}
  </style>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
