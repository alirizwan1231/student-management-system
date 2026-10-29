/** @type {import('next').NextConfig} */

// Fix 6 (audit H-5): security headers for the whole app. The CSP starts in
// Report-Only mode: deploy, watch the browser console / reports for a day
// for anything legitimate being blocked (Supabase REST + realtime and R2 are
// already allowed in connect-src), then flip CSP_REPORT_ONLY to false to
// enforce it. X-Frame-Options / nosniff / Referrer-Policy / Permissions-Policy
// are enforced immediately -- they cannot break the app.
const CSP_REPORT_ONLY = true;
const contentSecurityPolicy = [
  "default-src 'self'",
  // Next.js injects small inline bootstrap scripts/styles; tighten with
  // nonces later if you remove 'unsafe-inline'.
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.r2.cloudflarestorage.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  {
    key: CSP_REPORT_ONLY ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy",
    value: contentSecurityPolicy,
  },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // Ship only the icons / utilities actually used from these barrel
    // packages instead of pulling the whole library into the first bundle.
    optimizePackageImports: ["lucide-react", "date-fns", "recharts"],
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
  // pdf.js tries to load the optional "canvas" package on the server; we only use it in the browser.
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // The service worker must never be served from a stale HTTP cache,
        // otherwise updates to it would not reach users.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
