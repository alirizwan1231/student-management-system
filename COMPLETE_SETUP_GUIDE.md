# University Manager - Complete setup guide (accounts, keys, SQL, deploy)

Follow the parts in order. Total time: about 90 minutes the first time.

## PART 1 - Accounts you need (all have a free plan)
| # | Account | Used for | Needed to |
|---|---|---|---|
| 1 | **Supabase** (supabase.com) | Database + login | run anything |
| 2 | **Cloudflare** (cloudflare.com) | R2 file storage (needs a card on file to enable R2; the free tier is 10 GB) | upload files |
| 3 | **Resend** (resend.com) | Sending emails (reset password, OTP code, contact form, daily digest) | emails |
| 4 | **A domain name** (Namecheap, GoDaddy, Cloudflare Registrar...) | Professional URL + required by Resend to email real users | launch |
| 5 | **GitHub** (github.com) | Stores your code | deploy |
| 6 | **Vercel** (vercel.com) | Hosts the website (free Hobby plan; Vercel's Hobby plan is for non-commercial use, use Pro or another host if you earn money from the app) | deploy |

## PART 2 - Every key / variable you must have (12)
Put these in `university-manager-app/.env.local` (the Resend key is optional if you use Brevo) (and later in Vercel -> Settings -> Environment Variables).
| Variable | Where to get it | Secret? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase -> Project Settings -> API -> Project URL | no |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same page -> `anon` `public` key (new dashboards: "Legacy API keys" tab, or the Publishable key) | no |
| `SUPABASE_SERVICE_ROLE_KEY` | same page -> `service_role` key (new: Secret key) | **YES** |
| `R2_ACCOUNT_ID` | Cloudflare -> R2 -> right side "Account ID" | semi |
| `R2_ACCESS_KEY_ID` | Cloudflare -> R2 -> Manage API Tokens -> Create token | **YES** |
| `R2_SECRET_ACCESS_KEY` | shown once when the token is created | **YES** |
| `R2_BUCKET_NAME` | the bucket name you create | no |
| `EMAIL_PROVIDER` | `brevo` (no domain needed) or `resend` | no |
| `BREVO_API_KEY` | Brevo -> SMTP & API -> API Keys (see docs/BREVO_EMAIL_SETUP.md) | **YES** |
| `EMAIL_FROM` | `University Manager <your-verified-sender@gmail.com>` (a sender verified in Brevo) | no |
| `SUPPORT_EMAIL` | the inbox that receives contact-form messages | no |
| `CRON_SECRET` | make one: run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | **YES** |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` locally, your real domain when live (no trailing slash) | no |

## PART 3 - Install the project
1. Install **Node.js 20+** from nodejs.org. Check: `node -v`.
2. Unzip. Work only inside `university-manager-app` (ignore the `generator` folder; no batches to run).
3. Copy `.env.example` to `.env.local` and fill the 12 values as you collect them.
4. Terminal in `university-manager-app`: `npm install` then `npm run typecheck`. Send me any error text.

## PART 4 - Supabase (database + login)
1. supabase.com -> New project -> choose a region near you -> save the database password.
2. Open **SQL Editor**. Run these files from `supabase/migrations/` ONE BY ONE, in this exact order (open file, copy everything, paste, Run). Each is safe to re-run. If one errors, stop and send me the message.
1. `001_extensions.sql`
2. `002_auth_profiles.sql`
3. `003_semesters.sql`
4. `004_subjects.sql`
5. `005_lectures.sql`
6. `006_tasks.sql`
7. `007_resources.sql`
8. `008_rls_policies.sql`
9. `009_storage.sql`
10. `010_lecturers.sql`
11. `011_link_instructor_and_task_attachments.sql`
12. `012_admin_role_and_audit.sql`
13. `013_timetable.sql`
14. `014_study_groups.sql`
15. `015_timetable_extensions.sql`
16. `016_group_polls.sql`
17. `017_preview_group_by_code.sql`
18. `018_attendance_and_exams.sql`
19. `019_grades_and_notifications.sql`
20. `020_group_tasks.sql`
21. `021_groupmate_names.sql`
22. `022_server_updated_at.sql`
3. Make yourself admin (after you sign up in Part 7; replace the email):
   `update profiles set role = 'admin' where id = (select id from auth.users where email = 'you@example.com');`
4. **Authentication -> URL Configuration**: Site URL `http://localhost:3000`; Redirect URLs add `http://localhost:3000/**`.
5. **Authentication -> Providers -> Email**: for local testing you may turn "Confirm email" off. Turn it ON before launch.
6. Paste the 4 files from `email-templates/` into **Authentication -> Emails -> Templates** (see `email-templates/README.md`).
7. Backups: Database -> Backups (enable the daily backup on paid plans, or export manually before big changes).

## PART 5 - Cloudflare R2 (files)
1. Cloudflare -> R2 Object Storage -> Create bucket (private). Name = `R2_BUCKET_NAME`.
2. R2 -> Manage API Tokens -> Create API token -> permission **Object Read & Write**, limited to your bucket. Copy Access Key ID + Secret NOW (shown once) and the Account ID.
3. Bucket -> Settings -> **CORS policy** -> paste the JSON from `docs/R2_STORAGE_SETUP.md` (add your localhost and live domain).

## PART 6 - Resend (email)
1. Resend -> Domains -> Add your domain -> add the DNS records at your domain provider -> wait until "Verified".
2. API Keys -> Create -> copy into `RESEND_API_KEY`. Set `EMAIL_FROM` and `SUPPORT_EMAIL`.
3. **Supabase SMTP** (so login emails use Resend): Supabase -> Authentication -> Emails -> SMTP Settings -> enable custom SMTP: host `smtp.resend.com`, port `465`, user `resend`, password = Resend API key, sender = your `EMAIL_FROM` address.
   Details: `docs/RESEND_EMAIL_SETUP.md`.

## PART 7 - Run and test locally (`npm run dev`, open http://localhost:3000)
Sign up -> make yourself admin (Part 4 step 3) -> log out and in. Then test:
- [ ] Login with password, login with **Email code**, **Forgot password** link
- [ ] Semester, subject (set credit hours), task, lecture note, file upload (try a file over 10 MB: must be refused)
- [ ] Timetable class (cancel/move one day), Calendar shows class + task + exam
- [ ] Attendance, Exams, **Grades** (GPA appears), Groups (second account joins by code), Search (Ctrl+K)
- [ ] Settings: Reminders (turn on device notifications, send yourself a test), Download my data
- [ ] Admin panel + Analytics
- [ ] Production test of offline: `npm run build` then `npm start`; open once online; DevTools -> Application -> Service Workers -> Offline; reload
- [ ] Contact form message reaches `SUPPORT_EMAIL`

## PART 8 - Put it online
1. Edit `src/lib/legal.ts` (your name/company, country). Have a lawyer glance at /privacy and /terms before real users.
2. GitHub: new **private** repo; upload the `university-manager-app` folder contents. `.env.local` must NOT be uploaded (it is in `.gitignore`).
3. Vercel -> Add New Project -> import the repo -> Framework Next.js -> Environment Variables: paste all 12 (set `NEXT_PUBLIC_SITE_URL` to your final domain) -> Deploy.
4. Vercel -> Settings -> Domains -> add your domain and set the DNS records it shows.
5. Update the live address everywhere:
   - Supabase -> Authentication -> URL Configuration: Site URL = `https://yourdomain.com`; Redirect URLs add `https://yourdomain.com/**`
   - R2 CORS: add `https://yourdomain.com`
   - Vercel: confirm `NEXT_PUBLIC_SITE_URL`, then Redeploy.
6. Daily email digest: `vercel.json` already schedules `/api/cron/digest` every day at 03:00 UTC (08:00 Pakistan time). It only works when `CRON_SECRET` is set in Vercel. Test: Vercel -> project -> Settings -> Cron Jobs -> Run.
7. Turn **Confirm email ON** in Supabase.

## PART 9 - After launch
- Soft launch with 5-10 students for 1-2 weeks; fix what they report.
- Watch Supabase (database size, auth emails), Cloudflare R2 (storage), Resend (daily limit 100 on free) usage; set billing alerts.
- Check `/admin/analytics` weekly. Export a backup before changing the database.
- Rotate keys if one ever leaks (Supabase, R2, Resend, then update Vercel and redeploy).

## Troubleshooting
| Problem | Fix |
|---|---|
| Blank page / "Invalid API key" | wrong Supabase values; restart `npm run dev` after editing `.env.local` |
| "relation ... does not exist" | a SQL file was skipped; run 001-022 in order |
| Emails never arrive | Resend domain not verified, or Supabase custom SMTP not set |
| Upload says CORS / fails above 4.5 MB on Vercel | add the R2 CORS rule with your exact domain |
| Reset-password link says expired | Site URL / Redirect URL in Supabase does not match the address you use |
| Admin menu missing | run the admin SQL, then log out and in |
| Digest not sent | `CRON_SECRET` missing in Vercel, nobody enabled it in Settings -> Reminders, or Resend not configured |
| Offline does not work | only in a production build (`npm run build && npm start` or the deployed site), after one online visit |
