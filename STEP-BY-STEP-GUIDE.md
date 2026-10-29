# University Manager — Step-by-Step Guide to Finish the Audit Fixes

**Site:** https://ptutsms.vercel.app/ · **Stack:** Next.js (Vercel) + Supabase + Cloudflare R2
**Companion to:** University-Manager-Audit-Report-2026-10-25 and University-Manager-FIX-GUIDE-2026-10-25

This package already contains **all the code changes**. What remains is the part no
code can do for you: running one SQL migration in Supabase, fixing the email
provider, and flipping the right switches in the Supabase / Resend / Vercel
dashboards — **in the order below** (email must work *before* you turn on email
confirmation, or new users can never confirm and signup becomes unusable).

> Golden rule for this app: the browser talks directly to Supabase, so the
> database **is** your API. Every rule below therefore lives in Postgres
> (migration 027) or in a server route — never only in React.

---

## What was already fixed in this code package (no action needed from you)

| Audit item | Fix in this package |
|---|---|
| C-1 (code part) | Admin disable/role actions already used server routes with the service-role key — verified. The database lockdown is migration 027 (Part 1 below). |
| H-1 (code part) | Forgot-password and email-code forms now **always** show one generic message and never display the raw API error (real errors go to the browser console / server log only). The mail itself is Part 2 below. |
| H-3 Global search | `src/lib/search/localSearch.ts` rewritten: rows with a missing `deleted_at` are no longer dropped, a bad `keywords` value can no longer kill the whole search, semesters + exams are indexed, and if the local IndexedDB copy is still empty (fresh login, sync pending) search falls back to querying Supabase directly. The modal now uses `Promise.allSettled` and shows "Searching…" / a failure message instead of a false "No results found." |
| H-4 Middleware | `src/middleware.ts`: matcher now excludes `api`, `_next`, `robots.txt`, `sitemap.xml`, `manifest.json`, `sw.js`, `icons` and every static file extension; the login redirect is built cleanly (no more leaking the original query string into the login URL); `/join/*`, `/share/*`, `/auth/*` are public paths. New `src/app/robots.ts` and `src/app/sitemap.ts`. New public preview page `src/app/share/[id]` (shows **no** content — sign-in + group membership still protect everything). API routes keep returning **401 JSON** from their own handlers. |
| H-5 Headers | `next.config.js` now sends X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy, Permissions-Policy, and a Content-Security-Policy. CSP starts in **Report-Only** mode on purpose — see Part 5. |
| M-1 Invite codes (code part) | New codes are handled in migration 027 (Part 1). In the app: plain **members no longer see the invite code** in Group Detail (owner/moderators only, fetched through a new RPC), and the join preview shows **only the group name + description** (no owner name, no member count). |
| M-2 Validation | Zod refinements added: semester end ≥ start, timetable end-time > start-time and ends-on ≥ starts-from, subject credit hours 1–30. Database CHECK constraints are in migration 027. |
| M-3 Passwords | One shared rule (min **10** characters, letter + number, common-password blocklist) in `src/lib/validation/auth.ts`, used by signup, reset-password and change-password, with a **live checklist** under the field. You still must set the same rule server-side — Part 4. |
| M-4 Export | "Download my data" now exports `exportVersion: 2` with **grades**, the **profile**, **group memberships**, the **groups**, your own group **announcements / comments / polls**, and a **file manifest** with a short-lived download URL per uploaded file. |
| M-5 Silent forms | The proven bug (`TaskForm` returned silently with no subject) now sets a visible "Subject is required" error and focuses the field; the same silent return in `SubjectForm` (no semester) was fixed the same way. Both forms use `noValidate`. |
| M-6 Storage | `/api/storage/presign` **ignores the client's contentType** and derives it from the extension; it rejects a resourceId that belongs to another user. `/api/storage/confirm` HEAD-checks the **real size and content type** in R2 and deletes violators. `/api/storage/download` issues **60-second** signed URLs and stays owner-only (group-shared files go through `/api/groups/resources/[itemId]/download`, which checks membership). The fallback `/api/storage/upload` also derives the type server-side. R2 bucket steps are Part 6. |
| M-7 Offline/favicon | New `src/app/offline/page.tsx` and a real `public/favicon.ico` (the existing `/offline.html` service-worker fallback is untouched). |
| L-1 Legal | `src/lib/legal.ts` now reads the operator name, country and support email from environment variables and shows "Last updated: 29 October 2026". **You must set the real values** — Part 7. |
| L-2 Counters | Dashboard "Upcoming" and the Calendar footer now count **tasks + exams** through one shared definition (next 30 days) in `src/lib/db/repo/dashboard.ts`. |
| L-3 Attendance | Status is evaluated from the top: ≥90% **Excellent**, ≥target **On track**, ≥target−5 **Careful**, else **At risk**. 100% can no longer read "Careful". |
| L-4 Time inputs | New `src/components/ui/TimeSelect.tsx` (Hour / Minute / AM-PM selects, storing 24-hour `HH:MM`) replaces the native time inputs in Add-Class (timetable), Exams and Move-Occurrence. |
| Select dropdowns (added 2026-10-29, at Finn's request) | `src/components/ui/Select.tsx`: the hard-coded **288px max-height cap is removed** -- the menu now uses all the space to the edge of the viewport, so long lists are no longer cut in half. Worse bug in the same component: it closed on **any** captured scroll event, *including scrolling inside the option list itself*, so the dropdown vanished the moment you tried to scroll it. Now scrolls inside the panel are ignored, page/container scrolls **reposition** the menu to follow its trigger, and it only closes when the trigger scrolls fully off-screen. `SearchableSelect`'s fixed 240px cap was raised to a viewport-aware `min(70vh, 30rem)`. |
| L-6 Small UI | Note-edit page no longer says "this will be your first" while editing; the Subjects semester heading is no longer forced-uppercase; the email-digest toggle explains its state; "Upload now" is disabled and labelled "Nothing waiting to upload" when the queue is empty. |

Also fixed along the way: a **pre-existing TypeScript error** in
`src/lib/classpack/build.ts` (a `flatMap` return-type mismatch) that made
`npm run typecheck` fail on the original code — the project now type-checks
with **zero errors**.

Not changed, deliberately: L-5's blank first renders were partially addressed by
the search fix (same snapshot/sync pattern), but a full skeleton pass over
Profile/Groups was out of the safe scope of this package — the pages still work,
they just paint after first sync. L-7 (PostgREST schema hints) cannot be switched
off on hosted Supabase; Fix 1 is the real mitigation.

---

## PART 1 — Supabase SQL: run migration 027 (Fixes 1, 7, 8) · ~15 min · DO THIS FIRST

1. Open **Supabase Dashboard → your project → SQL Editor → New query**.
2. Paste the **entire** contents of `supabase/migrations/027_audit_fixes_2026_10_29.sql` from this package and click **Run**. It should finish with "Success. No rows returned". (It is written to be safe on a live database: the new CHECK constraints are added `NOT VALID` so old rows cannot make it fail.)
3. **Clean up the audit's deliberately bad data** (still in your database), then enforce the constraints on all rows. In the SQL Editor run:
   ```sql
   -- See the bad rows first:
   select id, name, start_date, end_date from public.semesters where end_date < start_date;
   select id, title, score, max_score from public.grade_entries where score > max_score;
   -- Fix or delete those rows (the semester named "Validation reversed dates"
   -- was created by the audit on purpose -- delete it), then run:
   alter table public.semesters validate constraint semesters_dates_order;
   alter table public.semesters validate constraint semesters_number_positive;
   alter table public.subjects validate constraint subjects_credit_hours_range;
   alter table public.timetable_slots validate constraint timetable_time_order;
   alter table public.grade_entries validate constraint grade_entries_score_within_max;
   alter table public.exams validate constraint exams_duration_positive;
   ```
4. **Delete the audit test accounts** (or at least the weak one): Supabase → **Authentication → Users** → delete `ptut.weak.20261025@gmail.com` (password `12345678` — it exists only to prove the old weak-password flaw), and delete the other two audit accounts and the group with invite code `B1E85D1B` unless you still want them for re-testing.
5. **Known side-effect of the invite-code fix:** every existing group gets a **7-day invite-code expiry starting the moment you run the migration**. Tell group owners to open their group → **Regenerate** and share the new (16-character) code/link. The old 8-character code format no longer matches new codes, but codes already stored keep working until they expire or are regenerated.

### Test Part 1 (C-1 acceptance — the most important test in this guide)
1. Sign in to the site as a normal (non-admin) account, open DevTools → Console and run `await (await fetch('/api/health')).ok` — skip that; instead get your token: in the Console run the app's own client is not exposed, so use **Application → Local Storage** / or sign in via the API:
   ```bash
   # 1) Sign in (replace project ref, email, password with a NORMAL account's)
   curl -s -X POST 'https://<PROJECT-REF>.supabase.co/auth/v1/token?grant_type=password' \
     -H 'apikey: <ANON_KEY>' -H 'Content-Type: application/json' \
     -d '{"email":"you@example.com","password":"<redacted>"}'
   # copy "access_token" and your user "id" from the response
   # 2) Try to promote yourself:
   curl -s -X PATCH 'https://<PROJECT-REF>.supabase.co/rest/v1/profiles?id=eq.<YOUR_ID>' \
     -H 'apikey: <ANON_KEY>' -H 'Authorization: Bearer <ACCESS_TOKEN>' \
     -H 'Content-Type: application/json' -H 'Prefer: return=representation' \
     -d '{"role":"admin"}'
   ```
   ✅ **PASS** = the request is rejected (403 / "permission denied for column role") and your role is still `student`.
   ✅ **PASS** = editing your display name in **Profile** still saves (full_name is an allowed column).
   ✅ **PASS** = a real admin can still disable/enable a user and change a role from **/admin** (those buttons use the server routes with the service-role key).

---

## PART 2 — Fix email delivery (Fix 2 / audit H-1) · ~30 min + DNS wait · DO BEFORE PART 3

Reset-password and email-code sign-in return **500 — Error sending recovery/magic
link email** for real accounts. This is a mail-provider problem, not app code.

**The honest blocker:** `ptutsms.vercel.app` is a Vercel subdomain — you cannot
verify it as a sending domain in Resend and it cannot receive mail. You need
**a domain you own** (any cheap domain is fine, e.g. from Cloudflare Registrar /
Namecheap / Porkbun). Buy one first if you don't have one; everything below
assumes `yourdomain.com`. (If you truly cannot get a domain yet, skip to the
"Brevo fallback" note at the end of this part — but Supabase Auth mail is the
part that is broken, and only a verified custom SMTP fixes it properly.)

1. **Resend** (resend.com) → sign up → **Domains → Add Domain** → enter `yourdomain.com` (or `mail.yourdomain.com`).
2. Resend shows DNS records (DKIM TXT/CNAMEs, SPF, and an MX for bounces). Add **every one of them** at your DNS provider (if your domain is on Cloudflare: **DNS → Records → Add record**, exactly as Resend shows, proxy **off** / DNS-only for mail records).
3. Wait until Resend shows the domain as **Verified** (minutes to a few hours).
4. Resend → **API Keys → Create API Key** → name it `supabase-auth`, permission **Sending access** → copy the key.
5. **Supabase → Authentication → Emails** (older UI: **Project Settings → Auth → SMTP Settings**) → enable **Custom SMTP**:
   - Host: `smtp.resend.com`
   - Port: `465`
   - Username: `resend`
   - Password: the Resend API key from step 4
   - Sender email: `noreply@yourdomain.com` (must be on the verified domain)
   - Sender name: `University Manager`
   → **Save**.
6. **Supabase → Authentication → URL Configuration**:
   - Site URL: `https://ptutsms.vercel.app`
   - Redirect URLs — add all three:
     `https://ptutsms.vercel.app/auth/confirm`
     `https://ptutsms.vercel.app/reset-password`
     `https://ptutsms.vercel.app/**`
7. **Supabase → Authentication → Email Templates**: open **Reset Password** and **Magic Link / OTP** and confirm each template actually contains `{{ .ConfirmationURL }}` (for the code template, `{{ .Token }}`) and no placeholder/example domain. This codebase also ships ready templates in `email-templates/` in this package — you can paste those in.
8. Create the mailboxes (or aliases/forwarders) **on that domain**: `noreply@` doesn't need an inbox, but `support@yourdomain.com` **does** — you need it for Part 7. In Cloudflare that's **Email → Email Routing** (free forwarding to your Gmail).

**Test Part 2:**
- Site → **Forgot password** with a **real** account → the email **arrives**, the link opens `/reset-password` and the reset works.
- Site → **Login → Email code** with a real account → the code arrives and signs you in.
- Forgot password with a **fake** address → the on-screen message is **identical** to the real one (the code fix in this package guarantees this), and nothing arrives.
- API check: `POST https://<PROJECT-REF>.supabase.co/auth/v1/recover` for a real account now returns `200 {}`, not 500.

*Brevo fallback note:* this app already supports Brevo for **app-sent** mail
(contact form, digest — see `.env.example`: `EMAIL_PROVIDER=brevo`). Brevo lets
you verify a single Gmail sender without a domain, which is fine for the contact
form, but Supabase **Auth** emails (reset/OTP/confirm) should still go through
the custom SMTP above — that's the flow the audit found broken.

---

## PART 3 — Turn ON email confirmation (Fix 3 / audit H-2) · ~10 min · ONLY AFTER PART 2 WORKS

1. **Supabase → Authentication → Providers → Email**:
   - **Confirm email** → **ON** (this turns `mailer_autoconfirm` off).
   - **Secure email change** → ON, if shown.
   - Save.
2. Nothing else to change in code: the signup form in this package already shows the **"Check your email to confirm your account"** screen whenever Supabase returns no session, and `/auth/confirm` already handles the confirmation link (including the expired-link redirect to `/login?error=link_expired`).
3. **Existing accounts decision** (don't skip silently): every account created before this fix was never verified. If the user base is just you/friends, leaving them is acceptable. If real strangers signed up, force a one-time re-verification before trusting those accounts — and delete the audit accounts either way (Part 1, step 4).

**Test Part 3:** register with a **fresh** email → you must **not** reach the dashboard before clicking the confirmation link in the email; after clicking, sign-in works.

---

## PART 4 — Set the password rule in Supabase (Fix 9 server half) · ~5 min

The app code now enforces min 10 + letter + number + a common-password
blocklist — but a direct API signup bypasses React, so set the server rule too:

1. **Supabase → Authentication → Settings** (Password section):
   - **Minimum password length: `10`**
   - If your plan shows character requirements, enable at least **letters + digits**.
   - If offered on your plan, enable **Leaked password protection** (HaveIBeenPwned).
   - Save.

**Test Part 4:** signup with `12345678`, `password1`, and any 9-character password → all rejected with a specific message, in the UI **and** via a direct `POST /auth/v1/signup`. A passphrase like `River-Plate-42` is accepted.

---

## PART 5 — Deploy the code + finish the security headers (Fixes 5 & 6) · ~20 min

1. **Replace your project files with this package** (keep your real `.env.local` — it is not in the zip). Then:
   ```bash
   npm install
   npm run build   # must pass clean before deploying
   ```
2. Push to the Git repo Vercel deploys from (or run `vercel --prod`). Vercel will rebuild automatically on push.
3. **Check the public routes the middleware used to block:**
   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" https://ptutsms.vercel.app/robots.txt    # expect 200
   curl -s -o /dev/null -w "%{http_code}\n" https://ptutsms.vercel.app/sitemap.xml   # expect 200
   curl -s -o /dev/null -w "%{http_code}\n" https://ptutsms.vercel.app/favicon.ico   # expect 200
   curl -s -X POST https://ptutsms.vercel.app/api/storage/presign                     # expect 401 + JSON, NOT a redirect to /login
   curl -sI https://ptutsms.vercel.app/login | grep -iE "x-frame|content-type-options|referrer-policy|permissions-policy|content-security"   # all present
   ```
4. **CSP Report-Only → enforcing (after ~1 day):** use the app normally for a day (sign in, sync, upload a file, open a PDF) with DevTools open and watch for `Content-Security-Policy-Report-Only` violations in the console. When a day passes with no legitimate breakage, open `next.config.js`, set `const CSP_REPORT_ONLY = false;`, rebuild and redeploy, then repeat step 3's header check — the header name becomes `Content-Security-Policy`.

---

## PART 6 — Cloudflare R2 checklist (Fix 12, dashboard half) · ~15 min

The code now enforces size/type/ownership on every storage route. Make the
bucket match it:

1. **Cloudflare Dashboard → R2 → your bucket → Settings**:
   - Confirm the bucket name matches `R2_BUCKET_NAME` in Vercel's env vars.
   - **Do NOT make the bucket public** (no `pub-*.r2.dev` public URL, no custom public domain). All access must stay through the app's signed URLs — the audit's download test depends on it.
2. **R2 → Manage R2 API Tokens** (or My Profile → API Tokens): the token the app uses (`R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` in Vercel) should have **Object Read & Write** on **this bucket only** — not account-wide admin. Create a bucket-scoped token if yours is broader, update the two Vercel env vars, and redeploy.
3. **CORS** (Bucket → Settings → CORS Policy): direct browser uploads use presigned PUTs from your site, so the bucket needs a CORS policy allowing your origin **only**:
   ```json
   [
     {
       "AllowedOrigins": ["https://ptutsms.vercel.app"],
       "AllowedMethods": ["PUT", "GET", "HEAD"],
       "AllowedHeaders": ["content-type"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
   (Add `http://localhost:3000` as a second origin only while developing.)
4. In **Vercel → Project → Settings → Environment Variables**, confirm these exist in Production and are **server-only** (never prefixed `NEXT_PUBLIC_`): `SUPABASE_SERVICE_ROLE_KEY`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`. The service-role key must never appear in client code or in the browser — in this codebase it is used only under `src/lib/supabase/admin.ts` and the `/api/admin/*` + `/api/account/delete` routes.

**Test Part 6 (storage acceptance):**
- Attach a real **PDF** to a note → it uploads, appears in **Uploads**, and opens.
- Signed in as **account B**, request account A's file through `/api/storage/download?path=users/<A-id>/...` → **403**.
- Try to upload an **11 MB** file, and a file renamed to `.pdf` that isn't one → both rejected (the confirm step checks the real object in R2).
- A group member **can** open a file shared to their group (via the group download route); a non-member cannot.

---

## PART 7 — Legal pages + support mailbox (Fix 14 / audit L-1) · ~10 min · NEEDS YOUR REAL DETAILS

I could not invent these for you — the code now reads them from environment
variables, so:

1. Decide the three real values: **your legal name (or company)**, **your country**, and a **support email that you actually read** — use `support@yourdomain.com` from Part 2, step 8.
2. **Vercel → Project → Settings → Environment Variables** (Production) → add:
   - `LEGAL_OPERATOR_NAME` = your name/company
   - `LEGAL_COUNTRY` = your country
   - `SUPPORT_EMAIL` = your support mailbox
   (and the same three in your local `.env.local` if you run it locally).
3. Redeploy. Open `/privacy` and `/terms` → they must show your real name, country, the support address, and "Last updated: 29 October 2026" — no placeholders anywhere.
4. Submit the **Contact form** once yourself and confirm the message actually arrives in that mailbox.

---

## PART 8 — Final acceptance run (the audit's journeys, in order) · ~30 min

Use a brand-new signup plus one existing account, and tick each line:

- [ ] API PATCH of my own `profiles.role` → **rejected**; changing my display name still works; an admin can still disable a user from /admin.
- [ ] Forgot password (real account) → email **arrives**, reset works. Email-code login → code arrives, sign-in works. Real vs fake email on forgot-password → **identical** on-screen message.
- [ ] New signup → **must confirm email** before reaching the dashboard.
- [ ] Ctrl-K search for a word in your own subject/task/note/group names (try the audit accounts' "AUDIT TEST" records before deleting them) → **results found**, clicking each opens the right record — immediately after a fresh login too, not only after waiting for sync.
- [ ] `curl` checks from Part 5, step 3 all pass (robots/sitemap/favicon 200, API 401 JSON, all security headers present).
- [ ] Semester with end < start → rejected in the UI **and** by a direct API insert. Signup with `12345678` → rejected with a specific reason.
- [ ] Groups: a new invite code is 16 characters; a plain **member cannot see the code** anywhere; the join preview shows **name only**; 10+ wrong codes in an hour → throttled; an expired code is rejected.
- [ ] Settings → Download my data → the JSON contains your **grade entries**, **group** data, profile name and the **file manifest**.
- [ ] Storage tests from Part 6, step "Test Part 6" all pass; PDF upload works end-to-end.
- [ ] Offline: DevTools → Network → Offline → reload → the app shows the offline page / your on-device data, and changes sync when you reconnect.
- [ ] Privacy/Terms show the real operator, country and working support email; the contact form delivers.
- [ ] Dashboard "Upcoming deadlines" includes an exam due within 30 days; a subject at 100% attendance reads **Excellent**.

When every box is ticked, the audit's fix order (report §9) is fully closed.

---

### Quick reference — where everything lives

| Thing | Location |
|---|---|
| The one SQL file to run | `supabase/migrations/027_audit_fixes_2026_10_29.sql` |
| Middleware / headers | `src/middleware.ts`, `next.config.js` |
| Search | `src/lib/search/localSearch.ts`, `src/components/search/GlobalSearchModal.tsx` |
| Password rule + checklist | `src/lib/validation/auth.ts`, `src/components/auth/PasswordChecklist.tsx` |
| Storage routes | `src/app/api/storage/{presign,confirm,upload,download,delete}/route.ts`, `src/lib/r2/validation.ts` |
| Export | `src/components/settings/AccountDataSection.tsx` |
| Invite codes (client) | `src/lib/groups/api.ts` (`getGroupInviteCode`, `previewGroupByCode`), `src/components/groups/GroupDetail.tsx`, `JoinGroupModal.tsx` |
| Legal identity | `src/lib/legal.ts` + env vars `LEGAL_OPERATOR_NAME`, `LEGAL_COUNTRY`, `SUPPORT_EMAIL` |

---

# UPDATE — 29 Oct 2026 (v3): Group Admin, Leave/Delete, Class Pack rules

Requested by Finn after Part 1. **Migration 028 is ALREADY RUN in Supabase**
(Success; trigger verified present). Nothing for you to run for this part.

## What changed in code (v3 zip)
- **Leave group** is now a clear button in every group's header (with a
  confirmation), not just a tiny link buried in the Members tab.
- **Delete group** now exists: owner (Admin) only, header button, confirm
  dialog. It is a soft-delete — the group disappears for everyone at once,
  data stays in the database. New DB function: `delete_group` (owner-only).
- **The creator is the Admin.** Role display now comes from
  `groups.owner_id`: the creator always shows as **Admin**, promoted CRs as
  **Moderator (CR)**, everyone else as **Member** — in the group header
  ("Your role: Admin"), the groups list and the Members tab.
  Note: the live check before running 028 found **0** membership rows with
  a wrong role — the database was already right; what you saw was the old
  UI label ("owner"/raw role text) and role-resolution timing. The new
  trigger `trg_enforce_group_owner_role` now forces the creator's row to
  'owner' forever, so it cannot drift.
- **Class Pack:** only the Admin or a promoted Moderator/CR can publish
  ("add") a class pack — the publish panel is hidden from plain members
  and `publish_class_pack` rejects non-staff at the database level.
  Everyone else can only **Import** a published pack into their own account.
- Deleted-group links now show "This group is no longer available" instead
  of loading forever; group search and lists exclude deleted groups.
- Offline: group reads still come from the local cache; Leave/Delete show
  a clear "needs internet" message offline instead of failing silently.

## Deliberately NOT done (your call, 29 Oct 2026)
- Email verification / Resend / "Confirm email" — left exactly as-is for
  now; set up later. Parts 2–4 of this guide stay paused until you say so.

---

# UPDATE — 29 Oct 2026 (v4): Task notes + Dashboard Class Pack button

Two features requested by Finn. **Code only — no Supabase changes needed**
(no new migration; both features reuse existing tables and functions).

## 1. Notes inside the Add Task form ("Preparation notes")
- A new section in the Add Task form (between Schedule and Description).
- Pick the subject first: all of that subject's existing notes/resources
  appear as a tick-list. Ticked notes are LINKED to the new task
  (resources.task_id) — they stay in the subject's notes as well and show
  up in the task's Attachments.
- "Upload new notes" stages files in the form; on save they are created
  as task attachments and queued for upload (offline-safe, same upload
  queue as everywhere else). Everything is local-first, so it works
  offline and syncs later.

## 2. "Class Pack updates" section on the main Dashboard
- A dedicated card at the top of the dashboard listing every group that
  has a published class pack: pack version vs your imported version,
  counts of NEW and UPDATED items since your last import (or
  "You're up to date").
- One-click "Import updates" per group, plus "Import all updates".
- It reuses the group tab's import engine exactly: unchanged items are
  skipped, changed items update, and items you edited yourself are never
  overwritten (they are reported as kept). If no group has a pack, the
  card stays hidden.

Deploy the same way as v3 (replace files, keep your real .env.local,
npm install, npm run build, push/vercel --prod).

---

# UPDATE — 30 Oct 2026 (v5): owner import hidden, mobile notifications, dark-by-default, speed

Code only — **no Supabase changes**. What changed:

1. **No import option for your own pack.** The dashboard "Class Pack
   updates" card no longer lists groups you created, and packs you
   published yourself are skipped — the pack is built from your data, so
   there is nothing to import. In a group's Class Pack tab, the creator /
   publisher sees a "This is your pack — nothing to import" note instead
   of the import panel. All other members still import exactly as before.
2. **Notifications panel on mobile.** It is now a fixed panel inside the
   screen margins (never half off-screen), height-capped with its own
   scroll; on desktop it stays the anchored dropdown next to the bell.
3. **Dark theme by default, no white flash.** The app ships dark: the
   server renders the dark theme and a tiny inline script keeps it unless
   a light preference was saved. Existing users who chose light keep
   light; everyone else gets dark, including first paint on refresh and
   the login screen.
4. **Speed.** The Add Task form, the dashboard's Class Pack / recent
   activity sections, and background helpers (install prompt, reminders,
   pending-join) now load as separate chunks after the core page; icon /
   date libraries are imported per-symbol (optimizePackageImports). The
   dashboard also skips pack requests entirely for groups you own.

---

# UPDATE — 30 Oct 2026 (v5.1): subject-notes picker fix + Task breakdown on top

Code only — no Supabase changes.

1. **Add Task → "Preparation notes" now finds the subject's notes.**
   The picker originally searched only resources saved directly against
   the subject, but notes made in the Notes flow hang off lectures
   (their files carry the lecture id, not the subject id), so subjects
   whose notes were lecture notes showed "no notes". It now lists direct
   subject resources, every file attached to the subject's lecture
   notes (labelled with the note it belongs to), and text-only notes
   themselves (ticking one attaches a link that opens the note).
2. **Task breakdown moved to the top of the dashboard**, right under the
   four stat cards; the subjects widget stays lower on the page.
