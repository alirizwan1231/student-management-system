import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { escapeHtml } from "@/lib/email/escape";
import { renderEmail, sendEmail } from "@/lib/email/resend";

export const runtime = "nodejs";
export const maxDuration = 60;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const DAY = 24 * 60 * 60 * 1000;

// Called once a day by a scheduler (Vercel Cron, see vercel.json). Vercel
// sends "Authorization: Bearer <CRON_SECRET>" automatically when the
// CRON_SECRET environment variable is set. Any other scheduler can call it
// with the same header.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: prefs, error } = await admin.from("notification_prefs").select("user_id").eq("email_digest", true).limit(500);
  if (error) {
    console.error("Digest: could not read preferences", error);
    return NextResponse.json({ error: "Could not read preferences" }, { status: 500 });
  }

  const now = new Date();
  const in2Days = new Date(now.getTime() + 2 * DAY).toISOString();
  const today = now.toISOString().slice(0, 10);
  const in7Days = new Date(now.getTime() + 7 * DAY).toISOString().slice(0, 10);
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  let sent = 0;
  let skipped = 0;

  for (const { user_id } of prefs ?? []) {
    const [{ data: tasks }, { data: exams }, userRes] = await Promise.all([
      admin.from("tasks").select("title, deadline, subject_id").eq("user_id", user_id).is("deleted_at", null).neq("status", "completed").not("deadline", "is", null).lte("deadline", in2Days).order("deadline").limit(15),
      admin.from("exams").select("title, exam_date, start_time, subject_id").eq("user_id", user_id).is("deleted_at", null).gte("exam_date", today).lte("exam_date", in7Days).order("exam_date").limit(10),
      admin.auth.admin.getUserById(user_id),
    ]);
    const email = userRes.data?.user?.email;
    if (!email || ((tasks ?? []).length === 0 && (exams ?? []).length === 0)) {
      skipped++;
      continue;
    }
    const ids = [...new Set([...(tasks ?? []), ...(exams ?? [])].map((r) => r.subject_id as string))];
    const { data: subjects } = await admin.from("subjects").select("id, name").in("id", ids);
    const name = new Map<string, string>((subjects ?? []).map((s) => [s.id as string, s.name as string] as const));

    const taskRows = (tasks ?? []).map((t) => {
      const due = new Date(t.deadline as string);
      const overdue = due.getTime() < now.getTime();
      return `<li style="margin:6px 0"><b>${escapeHtml(t.title as string)}</b> <span style="color:#94a3b8">(${escapeHtml(name.get(t.subject_id as string) ?? "Task")})</span><br><span style="color:${overdue ? "#e11d48" : "#475569"}">${overdue ? "Overdue \u2022 " : "Due "}${due.toUTCString().slice(0, 22)} UTC</span></li>`;
    });
    const examRows = (exams ?? []).map(
      (e) => `<li style="margin:6px 0"><b>${escapeHtml(e.title as string)}</b> <span style="color:#94a3b8">(${escapeHtml(name.get(e.subject_id as string) ?? "Exam")})</span><br><span style="color:#475569">${escapeHtml(e.exam_date as string)}${e.start_time ? " at " + escapeHtml((e.start_time as string).slice(0, 5)) : ""}</span></li>`
    );
    const body =
      (taskRows.length ? `<p style="margin:0 0 4px;font-weight:700;color:#0f172a">Tasks</p><ul style="margin:0 0 16px;padding-left:18px">${taskRows.join("")}</ul>` : "") +
      (examRows.length ? `<p style="margin:0 0 4px;font-weight:700;color:#0f172a">Upcoming exams</p><ul style="margin:0 0 16px;padding-left:18px">${examRows.join("")}</ul>` : "") +
      (site ? `<p style="margin:16px 0 0"><a href="${escapeHtml(site)}/dashboard" style="color:#3366ff;font-weight:600">Open University Manager</a></p>` : "") +
      `<p style="margin:16px 0 0;font-size:12px;color:#94a3b8">You can turn this digest off in Settings &rarr; Reminders.</p>`;

    const result = await sendEmail({ to: email, subject: `Your study digest: ${taskRows.length} task(s), ${examRows.length} exam(s)`, html: renderEmail("Your daily study digest", body) });
    if (result.ok) sent++;
    else skipped++;
    await sleep(600); // stay under Resend's default 2 requests/second
  }

  return NextResponse.json({ sent, skipped });
}
