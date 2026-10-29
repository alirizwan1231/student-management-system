# University Manager

A study-life app for university students: semesters, subjects, instructors, timetable, notes with files,
tasks, exams, attendance, grades/GPA, study groups (group tasks, polls, class packs), reminders, an admin
panel, and it keeps working **offline** (installable on a phone like an app).

Stack: Next.js 14 (App Router) + TypeScript + Tailwind, Supabase (database + login), Cloudflare R2 (files),
IndexedDB (Dexie) for offline data, Brevo/Resend (email), Vercel (hosting).

---------------------------------------------------------------------------------------------------

## 1. Accounts you need (all have a free plan)
| Account | Used for |
|---|---|
| Supabase | database + login |
| Cloudflare | R2 file storage (needs a card on file to switch R2 on; free tier is 10 GB) |
| Brevo (or Resend) | sending emails (sign-up, reset password, email code, contact form, daily digest) |
| GitHub + Vercel | putting the app online |

## 2. Run it on your computer
1. Install **Node.js 20 or newer** (nodejs.org).
2. Open a terminal in this folder and run:
   ```
   npm install
   ```
   (this also copies the PDF reader's worker file into `public/`)
3. Copy `.env.example` to a new file named `.env.local` and fill in the values (section 5).
4. Do the Supabase setup (section 3) and the R2 setup (section 4).
5. Start it:
   ```
   npm run dev
   ```
   Open http://localhost:3000
6. Before deploying: `npm run typecheck` and `npm run build` must finish without errors.

## 3. Supabase (database + login)
**Create the project:** supabase.com -> New project -> save the database password.
**Keys:** Project Settings -> API -> copy the Project URL, the `anon` key and the `service_role` key.

**Run the SQL files.** Supabase -> SQL Editor. Open each file in `supabase/migrations/`, copy everything,
paste, press Run. Do them ONE BY ONE in this exact order (all are safe to run again):

```
 1. 001_extensions.sql
 2. 002_auth_profiles.sql
 3. 003_semesters.sql
 4. 004_subjects.sql
 5. 005_lectures.sql
 6. 006_tasks.sql
 7. 007_resources.sql
 8. 008_rls_policies.sql
 9. 009_storage.sql
10. 010_lecturers.sql
11. 011_link_instructor_and_task_attachments.sql
12. 012_admin_role_and_audit.sql
13. 013_timetable.sql
14. 014_study_groups.sql
15. 015_timetable_extensions.sql
16. 016_group_polls.sql
17. 017_preview_group_by_code.sql
18. 018_attendance_and_exams.sql
19. 019_grades_and_notifications.sql
20. 020_group_tasks.sql
21. 021_groupmate_names.sql
22. 022_server_updated_at.sql
23. 023_groupmate_avatars.sql
24. 024_avatar_guard.sql
25. 025_class_packs.sql
26. 026_class_pack_publish.sql
```

**Make yourself the admin** (after you have signed up in the app; use your own email):
```sql
update profiles set role = 'admin' where id = (select id from auth.users where email = 'you@example.com');
```
Log out and in again. An "Admin panel" button appears in the sidebar.

**Authentication settings** (Authentication in the Supabase menu):
- URL Configuration: *Site URL* = your site address (`http://localhost:3000` while testing, later your Vercel/own domain). Add `<your site>/**` to *Redirect URLs*.
- Providers -> Email: for local testing you may turn "Confirm email" off. Turn it ON before real users sign up.
- Emails -> Templates: paste the 4 files from `email-templates/` (see `email-templates/README.md`).
- Emails -> SMTP Settings (needed for real users; the built-in mailer is very limited), example with Brevo:
  host `smtp-relay.brevo.com`, port `587`, username = your Brevo SMTP login, password = your Brevo SMTP key,
  sender = an address you verified in Brevo. Then raise Authentication -> Rate Limits -> emails per hour (e.g. 100).

**Where the app connects to Supabase (code):** `src/lib/supabase/client.ts` (browser), `server.ts` (server),
`admin.ts` (service-role, server only). They read the 3 `SUPABASE` variables from `.env.local`.

## 4. Cloudflare R2 (file storage)
1. Cloudflare -> R2 Object Storage -> **Create bucket** (keep it private). Its name = `R2_BUCKET_NAME`.
2. R2 -> **Manage API Tokens** -> Create token with **Object Read & Write** on that bucket.
   Copy the *Access Key ID* and *Secret Access Key* (shown once) and your *Account ID*.
3. Bucket -> Settings -> **CORS Policy** -> add (replace the site address with yours, no trailing slash):
   ```json
   [
     {
       "AllowedOrigins": ["https://YOUR-SITE.vercel.app", "http://localhost:3000"],
       "AllowedMethods": ["GET", "PUT", "HEAD"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
4. Put the 4 values in `.env.local` (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`).
5. In the running app open **Settings -> Storage check -> Run**. All four lines must be green.

**Where the app connects to R2 (code):** `src/lib/r2/client.ts` creates the S3 client from those 4 variables
(server only, never sent to the browser). Uploads: `src/app/api/storage/presign` + `confirm` (direct upload with
a short-lived link, max 10 MB per file) with a fallback `upload` route. Downloads: `src/app/api/storage/download`.
Files are stored under `users/<user id>/...`; class-pack shared copies under `packs/<group id>/...`.

## 5. Environment variables (`.env.local`, and the same names in Vercel)
| Variable | Where to get it | Secret? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase -> Project Settings -> API | no |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same page (anon / publishable key) | no |
| `SUPABASE_SERVICE_ROLE_KEY` | same page (service_role / secret key) | **yes** |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` | Cloudflare R2 | keys: **yes** |
| `EMAIL_PROVIDER`, `BREVO_API_KEY` (or `RESEND_API_KEY`), `EMAIL_FROM`, `SUPPORT_EMAIL` | Brevo / Resend | keys: **yes** |
| `CRON_SECRET` | any long random string (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) | **yes** |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000`, later your real address (no trailing slash) | no |

Never commit `.env.local`. After changing it, stop and restart `npm run dev`.

## 6. Put it online (Vercel)
1. Push the project to a **private** GitHub repository (`.env.local` is in `.gitignore`).
2. vercel.com -> Add New Project -> import the repo -> add every variable from section 5 -> Deploy.
3. Update the address in three places: Supabase URL Configuration, the R2 CORS rule, and `NEXT_PUBLIC_SITE_URL` in Vercel. Redeploy.
4. The daily email digest runs from `vercel.json` (needs `CRON_SECRET`). Turn "Confirm email" ON in Supabase.
5. Edit `src/lib/legal.ts` (your name/company, country) before launch; the Privacy Policy and Terms are a general template, have them reviewed.
6. Android app (optional): build it from your live address with pwabuilder.com (Package for stores -> Android).
   Put the generated `assetlinks.json` in `public/.well-known/` and redeploy.

## 7. First-run checklist
- Sign up, make yourself admin, log in again.
- Settings -> **Storage check** (all green) and **Sync check** (every row OK).
- Create a semester, subject, task, note with a PDF; open the PDF inside the app.
- Create a group, join it with a second account, try Group Tasks and the Class Pack tab.
- Turn on Offline mode (status pill), add something, switch back to Online and watch it sync (Uploads page shows files).

## 8. Where things live
- `src/app/` pages and API routes; `src/components/` screens; `src/lib/` logic.
- Offline database + sync: `src/lib/db/`, `src/lib/sync/` (push, pull, uploads, online/offline mode).
- File viewer (PDF, Word, Excel, PowerPoint, images): `src/components/files/`, `src/lib/files/`.
- Groups, polls, group tasks, class packs: `src/components/groups/`, `src/components/classpack/`, `src/lib/groups/`, `src/lib/classpack/`.
- Service worker (offline pages): `public/sw.js`. Install icons: `public/icons/`.
- SQL: `supabase/migrations/` (run in order, section 3).

## 9. If something goes wrong
| Problem | Fix |
|---|---|
| "Invalid API key" / blank page | wrong Supabase values; restart `npm run dev` after editing `.env.local` |
| "relation ... does not exist" | a SQL file was skipped; run them in order |
| Emails never arrive | set up SMTP (section 3); check Brevo -> Transactional -> Logs |
| Files fail to upload or open | run Settings -> Storage check; fix the R2 keys or CORS rule |
| Something added on one device is missing on another | Settings -> Sync check -> Retry uploads / Re-download all my data |
| Offline does not work | only in a production build (`npm run build` then `npm start`, or the deployed site), after one online visit |
