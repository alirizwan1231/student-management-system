import type { MetadataRoute } from "next";

// Fix 5 (audit H-4): this file makes /robots.txt a real, public route.
// It was previously redirected to /login by the auth middleware, so
// crawlers could never read it.
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://ptutsms.vercel.app";
  return {
    rules: [{ userAgent: "*", allow: ["/login", "/signup", "/privacy", "/terms", "/contact"], disallow: ["/dashboard", "/admin", "/api/"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
