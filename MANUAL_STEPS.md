# University Manager - setup and manual steps

> **Start with `COMPLETE_SETUP_GUIDE.md`** (accounts, all 12 keys, SQL order, deploy). This file is a shorter reference.

The code was rebuilt from a PDF export of a long chat and then extended. Everything passes a TypeScript
syntax check and every import resolves, but it has **not been compiled or run** (no network where it was
built). Always start with:

    npm install
    npm run typecheck      # fix anything it reports
    npm run dev

## 1. Environment (.env.local)
Copy `.env.example` and fill in the Supabase values (URL, anon key, service-role key) and the four
Cloudflare R2 values. Never expose the service-role key or R2 secrets to the browser.

## 2. Supabase SQL (SQL editor, in this order; every file is safe to re-run)
012_admin_role_and_audit, 013_timetable, 014_study_groups, 015_timetable_extensions, 016_group_polls,
017_preview_group_by_code, **018_attendance_and_exams** (new: attendance + exam schedule).
Make yourself admin once:  `update profiles set role = 'admin' where email = 'you@example.com';`

## 3. Supabase Auth settings (needed for reset password + email code login)
1. Authentication -> URL Configuration: Site URL = your domain (`http://localhost:3000` while testing);
   add `<your-domain>/**` to Redirect URLs.
2. Paste the 4 files from `email-templates/` into Authentication -> Emails -> Templates
   (see `email-templates/README.md` for which file goes where and the subject lines).
3. Set up **custom SMTP** (Resend, Brevo, SendGrid...) before launch. The built-in mailer is heavily
   rate-limited and will not deliver reliably to real users.
4. Email provider: keep "Enable Email provider" on. Email code login works for existing accounts only.

## 3b. Email (Resend), privacy pages and account deletion
- Follow `docs/RESEND_EMAIL_SETUP.md`: Part A = Supabase SMTP (so reset/OTP emails arrive), Part B = three
  env variables for emails sent by the app (`RESEND_API_KEY`, `EMAIL_FROM`, `SUPPORT_EMAIL`).
- Edit `src/lib/legal.ts` (your name/company, country) before launch. `/privacy`, `/terms` and `/contact`
  are public pages linked from login, signup and Settings. They are a general template, so have a
  lawyer review them before a commercial launch.
- Settings -> "Your data and privacy": download all data as JSON, and permanently delete the account
  (removes database rows, the R2 files, and the login). The last remaining admin cannot delete themselves.

## 4. Cloudflare R2 (see docs/R2_STORAGE_SETUP.md)
Private bucket, API token with Object Read & Write. Max upload is **10 MB per file** (enforced in the
browser and again on the server in `/api/storage/upload`; constant: `MAX_FILE_SIZE_MB` in
`src/lib/r2/validation.ts`).
Uploads now go **directly from the browser to R2** (presigned URL) and the server then verifies the real
size, so the 10 MB limit also works on Vercel. This needs the CORS rule in `docs/R2_STORAGE_SETUP.md`;
until CORS is set the app falls back to uploading through the server (works locally, ~4.5 MB on Vercel).

## 5. Offline mode and installing the app
- The service worker (`public/sw.js`) is only active in a **production build**:
  `npm run build && npm start`, then open the site once while online. After that the app opens offline,
  and anything you add offline syncs when you are back online.
- To test: DevTools -> Application -> Service Workers, tick "Offline", reload.
- Install: Chrome/Edge show an in-app "Install" banner (also in the address bar); on iPhone use
  Share -> Add to Home Screen. Icons are in `public/icons/`.
- `next-pwa` was removed (it would have overwritten `sw.js` on every build).

## 6. What was added in this version
- Forgot password + reset password pages; email-code (OTP) login tab; branded email templates.
- `/auth/confirm` route (links work even when opened on another device) and open-redirect protection.
- Offline service worker, offline page, PWA icons, install banner, mobile "More" menu.
- Attendance tracker (`/attendance`): mark per class, target %, "can miss N more classes" / "attend N more".
- Exam schedule (`/exams`): countdowns, edit/delete, shown on the calendar in red.
- Lecture filters (files / time period), resource filters (type, search, sort) and file download.
- Admin analytics (`/admin/analytics`): signups, content activity, task status, file types, attendance.
- Sync now pulls timetable, instructors, attendance and exams too, so data survives logout/new devices.
- Removed unused `ProgressSummary.tsx`.

- Direct-to-R2 uploads with size verification, Resend email helper, contact form, privacy policy, terms,
  data export and account deletion.

- Grades and GPA tracker (`/grades`, migration 019), reminders (device notifications + daily email digest cron),
  and offline reading of groups (cached after you open them online; posting still needs internet).

## 7. Known gaps
- Group posts, votes and joins need internet (group content is readable offline only after you opened it online once).
- Device notifications fire only while the app/browser is running; the daily email digest covers the closed-app case.
- Digest runs on a daily schedule in UTC and does not follow each user's time zone.
