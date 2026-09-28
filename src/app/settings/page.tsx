"use client";

import { useSyncStatus } from "@/lib/sync/context";
import { SignOutButton } from "@/components/auth/SignOutButton";

export default function SettingsPage() {
  const { status, lastSyncedAt, triggerSync } = useSyncStatus();

  const isSyncing = status === "syncing";

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="mb-7">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Settings
          </h1>
        </div>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          Manage your sync preferences and account.
        </p>
      </div>

      <div className="space-y-5">
        {/* Sync Section */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025]">
          <div className="border-b border-slate-100 px-5 py-4 dark:border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                  <path
                    d="M20 11a8.1 8.1 0 0 0-14.7-4M4 5v4h4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M4 13a8.1 8.1 0 0 0 14.7 4M20 19v-4h-4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <div>
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Sync</h2>
                <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                  Keep your academic data synchronized.
                </p>
              </div>
            </div>
          </div>

          <div className="p-5">
            {/* Status */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-white/[0.06] dark:bg-white/[0.02]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">
                    Current status
                  </p>

                  <div className="mt-1.5 flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        isSyncing
                          ? "animate-pulse bg-brand-500"
                          : status === "sync_failed"
                            ? "bg-status-overdue"
                            : "bg-status-completed"
                      }`}
                    />

                    <p className="text-sm font-semibold capitalize text-slate-700 dark:text-slate-200">
                      {status}
                    </p>
                  </div>
                </div>

                <button
                  onClick={triggerSync}
                  disabled={isSyncing}
                  className="group inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-[1px] hover:bg-brand-700 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-brand-500 dark:hover:bg-brand-400"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className={`h-4 w-4 ${
                      isSyncing ? "animate-spin" : "transition-transform group-hover:rotate-180"
                    }`}
                  >
                    <path
                      d="M20 11a8.1 8.1 0 0 0-14.7-4M4 5v4h4"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M4 13a8.1 8.1 0 0 0 14.7 4M20 19v-4h-4"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>

                  {isSyncing ? "Syncing..." : "Sync now"}
                </button>
              </div>

              {/* Last Synced */}
              <div className="mt-4 border-t border-slate-200/70 pt-3 dark:border-white/[0.06]">
                <p className="text-xs text-slate-400 dark:text-slate-500">Last synced</p>
                <p className="mt-0.5 text-sm font-medium text-slate-600 dark:text-slate-300">
                  {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : "Never synced"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Account Section */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025]">
          <div className="border-b border-slate-100 px-5 py-4 dark:border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                  <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.7" />
                  <path d="M5 20a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                </svg>
              </div>

              <div>
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Account</h2>
                <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                  Manage your current session.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 p-5">
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Sign out</p>
              <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                Sign out from this account on this device.
              </p>
            </div>

            <SignOutButton />
          </div>
        </section>
      </div>
    </main>
  );
}
