# Changes-only package (NOT the full project)

Contains only the files that are new or changed. Folder structure = your project root (university-manager-app).

## Apply safely (5 steps)
1. In your project: `git add . && git commit -m "before changes"` (so you can undo anything).
2. Copy everything from this `changes/` folder over your project (merge folders, replace files).
3. `git diff` to review. If a replaced file lost something of yours, restore just that part (`git checkout -p <file>`).
4. `npm install` (adds pdfjs-dist, mammoth, read-excel-file and copies the PDF worker), then `npm run typecheck` and `npm run build`.
5. Supabase SQL Editor: run `supabase/migrations/023_groupmate_avatars.sql`.

## Needed once (config, not code)
Cloudflare R2 -> your bucket -> Settings -> CORS must allow GET and PUT from your site address
(see docs/R2_STORAGE_SETUP.md). Without it, files still open via "Open in a new tab" and upload through the server fallback.

## What this finishes
1. Uploads: no more "Waiting for upload" (uploads run independently, no give-up after 5 tries, retry buttons, no duplicates), live progress bars.
2. Uploads manager page: /uploads (queued, uploading, failed, uploaded) + retry/remove/clear.
3. Online/Offline mode pill (clickable, saved on the device) + real internet detection (/api/health).
4. Group attribution: name + picture (initials if no picture) on announcements, shared notes, polls ("Created by").
5. In-app file viewer: PDF, images, Word (.docx), Excel (.xlsx), text. Downloaded once, then opens instantly and offline.

## Quick test
- Offline mode ON -> attach a file -> /uploads shows "Queued: you are in Offline mode" -> switch Online -> progress bar -> "Uploaded".
- Open a PDF/docx/xlsx twice: the second open says "Saved on this device".
- Group: create an announcement and a poll with another account; both show "Posted by / Created by <name>".
