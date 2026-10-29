import type { MetadataRoute } from "next";

// Fix 5 (audit H-4): public sitemap. Only public pages belong here -- the
// rest of the app is private and behind sign-in.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://ptutsms.vercel.app";
  const now = new Date();
  return ["/login", "/signup", "/privacy", "/terms", "/contact"].map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: path === "/login" ? 1 : 0.5,
  }));
}
