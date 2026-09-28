import type { CapacitorConfig } from "@capacitor/cli";

// Wraps the SAME Next.js build for Android via Capacitor. No separate
// backend or auth system -- the Android app talks to the same Supabase
// project as the web app, using the same user accounts.
//
// Typical flow:
//   npm run build && npm run export (or point webDir at your hosted PWA URL
//   via server.url below, which is usually simpler for a Next.js app that
//   relies on server components/middleware rather than a static export)
//   npx cap add android   (first time only)
//   npm run cap:sync
//   npm run cap:android
const config: CapacitorConfig = {
  appId: "com.universitymanager.app",
  appName: "University Manager",
  webDir: "public",
  server: {
    // Point this at your deployed Vercel URL so the Android shell always
    // loads the live app (with middleware/server components intact)
    // instead of requiring a static export of a dynamic Next.js app.
    url: "https://your-deployed-app.vercel.app",
    cleartext: false,
  },
};

export default config;
