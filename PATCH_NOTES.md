# What changed in files that already existed (in case you prefer editing by hand)

- package.json: add dependencies "pdfjs-dist": "3.11.174", "mammoth": "^1.8.0", "read-excel-file": "^5.8.5" and script "postinstall": "node scripts/copy-pdf-worker.mjs".
- next.config.js: add `webpack: (config) => { config.resolve.alias.canvas = false; config.resolve.alias.encoding = false; return config; },`
- public/sw.js: in the activate handler keep the file cache: `keys.filter((k) => !k.startsWith(VERSION) && k !== "um-files")`.
- src/middleware.ts: add "/api/health" to PUBLIC_PATHS.
- src/lib/db/index.ts: PendingUpload.status also allows "done"; new optional fields file_size, file_type, next_attempt_at, started_at, completed_at, storage_path.
- nav-items.ts: add { href: "/uploads", label: "Uploads", icon: UploadCloud }.
- AppShell.tsx: render <FileViewerHost /> next to <UnsyncedBanner />.
- NotificationBell.tsx: skip polling when getAppMode() === "offline".
- SignOutButton.tsx: call clearFileCache() on sign-out.
- NotesAttachments.tsx / ResourceList.tsx / GroupLibrary.tsx: open files with openFileViewer(...) instead of window.open / download.
- GroupOverview.tsx / GroupLibrary.tsx / GroupPolls.tsx: use <Attribution .../> (new component).
- lib/groups/api.ts + profiles.ts + polls.ts + types/groups.ts: member profiles now include avatar_url; polls carry creator_name / creator_avatar.
- lib/r2/storage.ts: signed download links are "inline" with the right content type.
- Rewritten completely: pendingUploads.ts, storage/client.ts (XHR progress), sync/uploads.ts, sync/engine.ts, sync/context.tsx, SyncStatusIndicator.tsx.
