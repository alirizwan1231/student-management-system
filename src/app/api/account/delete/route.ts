import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { purgePrefix } from "@/lib/r2/direct";
import { escapeHtml } from "@/lib/email/escape";
import { renderEmail, sendEmail } from "@/lib/email/resend";

export const runtime = "nodejs";

// Permanently deletes the signed-in user's account: their files in R2, then
// the auth user (all rows owned by the user are removed by ON DELETE CASCADE).
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { confirm?: string } | null;
  if (body?.confirm !== "DELETE") return NextResponse.json({ error: "Type DELETE to confirm." }, { status: 400 });

  const admin = createAdminClient();

  // Never leave the platform without an administrator.
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role === "admin") {
    const { count } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin");
    if ((count ?? 0) <= 1) {
      return NextResponse.json({ error: "You are the only administrator. Make another user an admin before deleting this account." }, { status: 400 });
    }
  }

  try {
    await purgePrefix(`users/${user.id}/`);
  } catch (error) {
    console.error("R2 purge failed during account deletion:", error);
    return NextResponse.json({ error: "Could not delete your files. Nothing was deleted; please try again." }, { status: 500 });
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("Account deletion failed:", error);
    return NextResponse.json({ error: "Could not delete your account. Please contact support." }, { status: 500 });
  }

  if (user.email) {
    await sendEmail({
      to: user.email,
      subject: "Your University Manager account was deleted",
      html: renderEmail("Account deleted", `<p>The account <b>${escapeHtml(user.email)}</b> and all of its data have been permanently deleted.</p><p>If you did not do this, contact support right away.</p>`),
    });
  }
  return NextResponse.json({ ok: true });
}
