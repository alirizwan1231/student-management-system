# What this version contains / what to run

## SQL (Supabase -> SQL Editor), in this order. All files are safe to re-run.
001_extensions ... 019_grades_and_notifications (see supabase/migrations), then:
- 020_group_tasks.sql          group weekly tasks, per-member completion, notes attached to tasks
- 021_groupmate_names.sql      people in the same group can see each other's NAMES (not emails)
- 022_server_updated_at.sql    server-side updated_at -> reliable sync between phone and laptop

## npm
`npm install` (new packages: @fontsource-variable/inter, @fontsource-variable/plus-jakarta-sans; next-pwa removed)

## New since the previous zip
- Group Tasks tab (weekly planner), add-to-my-tasks, notes attached to a task
- Names in groups (via RPC), "Add your name" prompt, profile name validation
- Notification bell for group activity (shared items, announcements, comments, group tasks)
- Subjects page + menu item; mobile bar: Dashboard, Tasks, Timetable, Notes, More
- Instructor picker (select existing or add new), change password, show/hide password eye
- Custom Select dropdown everywhere (bottom sheet on phones)
- Mobile layout fixes (group buttons, scrollable tabs, no sideways page scroll)
- Offline fix (useUser works offline, service worker caches page scripts), self-hosted fonts
- Sync fixes: per-table pull, clock-safe watermark, Settings -> Sync check (retry uploads / re-download)
- Brevo email provider (no domain needed), admin error visibility, admin panel link
- Android: middleware allows /.well-known (for assetlinks.json); see COMPLETE_SETUP_GUIDE.md

## Environment variables
See .env.example (Supabase x3, R2 x4, EMAIL_PROVIDER/BREVO_API_KEY/EMAIL_FROM/SUPPORT_EMAIL, CRON_SECRET, NEXT_PUBLIC_SITE_URL).
