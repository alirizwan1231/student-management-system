# Packaging as an Android APK

This app is built PWA-first; Capacitor wraps the deployed web app rather
than requiring a separate native codebase.

1. Deploy the Next.js app to Vercel (or any host) first.
2. Update `server.url` in `capacitor.config.ts` to that deployment's URL.
3. `npx cap add android` (first time only — generates the `android/` folder).
4. `npm run cap:sync`
5. `npm run cap:android` to open Android Studio and build the APK/AAB.

Offline behavior, auth, and data isolation all work identically inside the
Capacitor shell, since it's the same web app, the same Supabase project,
and the same IndexedDB-backed sync engine (batch 10) -- just presented
without browser chrome.
