// Transactional email for the app itself (contact form, account-deletion
// notice, daily digest). Supports Brevo (free sender verification, no domain
// needed) and Resend. The provider is picked from EMAIL_PROVIDER, or
// automatically from whichever API key is present.
//
// (File name is historical; everything that sends email imports from here.)
export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

type Provider = "brevo" | "resend";

function activeProvider(): Provider | null {
  const forced = (process.env.EMAIL_PROVIDER || "").toLowerCase();
  if (forced === "brevo") return process.env.BREVO_API_KEY ? "brevo" : null;
  if (forced === "resend") return process.env.RESEND_API_KEY ? "resend" : null;
  if (process.env.BREVO_API_KEY) return "brevo";
  if (process.env.RESEND_API_KEY) return "resend";
  return null;
}

export function isEmailConfigured(): boolean {
  return Boolean(activeProvider() && process.env.EMAIL_FROM);
}

// "University Manager <me@example.com>"  ->  { name, email }
function parseFrom(from: string): { name?: string; email: string } {
  const m = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (!m) return { email: from.trim() };
  return { name: m[1].replace(/^"|"$/g, "") || undefined, email: m[2].trim() };
}

async function sendViaBrevo(input: SendEmailInput, from: string) {
  const to = (Array.isArray(input.to) ? input.to : [input.to]).map((email) => ({ email }));
  return fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": process.env.BREVO_API_KEY!, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      sender: parseFrom(from),
      to,
      subject: input.subject,
      htmlContent: input.html,
      textContent: input.text,
      replyTo: input.replyTo ? { email: input.replyTo } : undefined,
    }),
  });
}

async function sendViaResend(input: SendEmailInput, from: string) {
  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: input.to, subject: input.subject, html: input.html, text: input.text, reply_to: input.replyTo }),
  });
}

export async function sendEmail(input: SendEmailInput): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const provider = activeProvider();
  const from = process.env.EMAIL_FROM;
  if (!provider || !from) return { ok: false, skipped: true, error: "Email is not configured" };
  try {
    const res = provider === "brevo" ? await sendViaBrevo(input, from) : await sendViaResend(input, from);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`${provider} email error:`, res.status, body);
      return { ok: false, error: `Email provider returned ${res.status}` };
    }
    return { ok: true };
  } catch (error) {
    console.error(`${provider} email request failed:`, error);
    return { ok: false, error: "Could not reach the email provider" };
  }
}

// Branded wrapper so every app email looks the same.
export function renderEmail(heading: string, bodyHtml: string): string {
  return `<!doctype html><html lang="en"><body style="margin:0;background:#f1f5f9;padding:28px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:560px"><tr><td style="background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;padding:32px">
<p style="margin:0 0 18px;font-size:16px;font-weight:700;color:#3366ff">&#127891; University Manager</p>
<h1 style="margin:0 0 14px;font-size:20px;color:#0f172a">${heading}</h1>
<div style="font-size:14px;line-height:22px;color:#475569">${bodyHtml}</div>
</td></tr></table></td></tr></table></body></html>`;
}