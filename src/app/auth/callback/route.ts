import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/utils/safeRedirect";

// Completes PKCE-style redirects (code in the URL) by exchanging the code
// for a session cookie.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = safeRedirectPath(searchParams.get("redirectTo") || searchParams.get("next"));

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(`${origin}/login?error=link_expired`);
  }
  return NextResponse.redirect(`${origin}${redirectTo}`);
}
