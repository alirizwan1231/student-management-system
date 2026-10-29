import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Fix 5 (audit H-4): public pages only. API routes are NOT listed here on
// purpose -- they are excluded from this middleware entirely by the matcher
// below, and each route handler returns its own 401 JSON instead of being
// bounced to an HTML login page. robots.txt / sitemap.xml are served by
// src/app/robots.ts and src/app/sitemap.ts and are likewise excluded by the
// matcher, so crawlers can always reach them.
const PUBLIC_PATHS = [
  "/", "/login", "/signup", "/forgot-password", "/reset-password", "/offline",
  "/auth/callback", "/auth/confirm", "/privacy", "/terms", "/contact",
];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  // /join/<code> and /share/<id> are deliberately public preview/entry pages:
  // they show no private content (see the pages themselves) and exist so an
  // invite or shared link works for someone who is not signed in yet.
  const isPublic =
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/join/") ||
    pathname.startsWith("/share/") ||
    pathname.startsWith("/auth/");
  if (!user && !isPublic) {
    // Fix 5D: build the redirect cleanly. The old code cloned the request
    // URL, which leaked the original query string (e.g. a storage path) into
    // the login URL. Only a sanitised, same-site path is carried across.
    const redirectUrl = new URL("/login", request.url);
    if (pathname.startsWith("/") && !pathname.startsWith("//")) {
      redirectUrl.searchParams.set("redirectedFrom", pathname);
    }
    return NextResponse.redirect(redirectUrl);
  }
  // Admin area: role is re-checked on every request from the database --
  // never trust a cached/client value here.
  if (user && pathname.startsWith("/admin")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, disabled_at")
      .eq("id", user.id)
      .single();
    if (!profile || profile.role !== "admin" || profile.disabled_at) {
      const redirectUrl = new URL("/dashboard", request.url);
      return NextResponse.redirect(redirectUrl);
    }
  }
  return response;
}

export const config = {
  // Fix 5A: keep the auth middleware away from APIs, Next internals, the
  // service worker, the manifest, icons, robots.txt, sitemap.xml and ANY
  // static file extension (favicon.ico included).
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json|sw.js|icons|offline.html|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt|xml|webmanifest)$).*)",
  ],
};
