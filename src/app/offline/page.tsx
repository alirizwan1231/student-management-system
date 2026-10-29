import Link from "next/link";

// Fix 13 (audit M-7): /offline was referenced by the app shell but returned
// 404. This page is public (see middleware PUBLIC_PATHS) and static, so the
// service worker / a direct visit can always render it. The existing
// /offline.html fallback used by public/sw.js is kept as the last resort.
export const metadata = { title: "Offline - University Manager" };

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-slate-50">You&apos;re offline</h1>
      <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
        Your data is stored on this device and will sync when you&apos;re back online. You can keep working in the
        parts of the app you have already opened.
      </p>
      <Link href="/dashboard" className="mt-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
        Go to my dashboard
      </Link>
    </main>
  );
}
