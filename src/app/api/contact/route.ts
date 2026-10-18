import { NextResponse } from "next/server";
import { escapeHtml } from "@/lib/email/escape";
import { isEmailConfigured, renderEmail, sendEmail } from "@/lib/email/resend";

export const runtime = "nodejs";

// Very small in-memory rate limit (per server instance). Good enough to stop
// casual abuse; use Upstash/Redis if you need a strict global limit.
const hits = new Map<string, number[]>();
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) return NextResponse.json({ error: "Too many messages. Please try again later." }, { status: 429 });

  const body = (await request.json().catch(() => null)) as { name?: string; email?: string; message?: string; website?: string } | null;
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  if (body.website) return NextResponse.json({ ok: true }); // honeypot: bots fill hidden fields

  const name = (body.name ?? "").trim().slice(0, 100);
  const email = (body.email ?? "").trim().slice(0, 200);
  const message = (body.message ?? "").trim();
  if (!name || !EMAIL_RE.test(email)) return NextResponse.json({ error: "Please enter your name and a valid email." }, { status: 400 });
  if (message.length < 10 || message.length > 4000) return NextResponse.json({ error: "Message must be between 10 and 4000 characters." }, { status: 400 });

  const to = process.env.SUPPORT_EMAIL;
  if (!to || !isEmailConfigured()) return NextResponse.json({ error: "Support email is not set up yet." }, { status: 503 });

  const html = renderEmail(
    "New support message",
    `<p><b>From:</b> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p><p style="white-space:pre-wrap">${escapeHtml(message)}</p>`
  );
  const result = await sendEmail({ to, subject: `Support: message from ${name}`, html, text: `From: ${name} <${email}>\n\n${message}`, replyTo: email });
  if (!result.ok) return NextResponse.json({ error: "Could not send your message. Please try again later." }, { status: 502 });

  hits.set(ip, [...recent, now]);
  return NextResponse.json({ ok: true });
}
