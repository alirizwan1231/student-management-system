"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Users } from "lucide-react";
import { db } from "@/lib/db";
import { useUser } from "@/hooks/useUser";
import { useSyncStatus } from "@/lib/sync/context";
import { classPackUrl, joinErrorMessage, joinWithCode } from "@/lib/groups/pendingJoin";

const DISMISS_KEY = "um-join-card-dismissed";

// For a brand-new account with no subjects yet: join the class with the code (or the invite link) and import everything.
export function JoinClassCard() {
  const { user } = useUser();
  const { lastSyncedAt } = useSyncStatus();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hidden, setHidden] = useState(() => typeof window !== "undefined" && sessionStorage.getItem(DISMISS_KEY) === "1");
  const subjects = useLiveQuery(() => (user ? db.subjects.where({ user_id: user.id }).filter((s) => s.deleted_at === null).count() : -1), [user?.id], -1);

  // wait for the first sync, so existing users never see this by mistake
  if (!user || hidden || subjects !== 0 || !lastSyncedAt) return null;

  const join = async () => {
    if (!code.trim()) return setError("Enter the class code.");
    if (!navigator.onLine) return setError("You are offline. Connect to the internet to join.");
    setBusy(true);
    setError(null);
    try {
      const group = await joinWithCode(code);
      router.push(classPackUrl(group.id));
    } catch (err) {
      setError(joinErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="mb-4 rounded-2xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-500/25 dark:bg-brand-500/10">
      <div className="flex items-start gap-3">
        <Users size={18} className="mt-0.5 shrink-0 text-brand-600 dark:text-brand-300" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900 dark:text-white">Join your class</p>
          <p className="mt-0.5 text-xs leading-5 text-slate-600 dark:text-slate-300">Got a class code from your representative? Join and get all your subjects, teachers and timetable in one click, no typing.</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Class code"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100 sm:max-w-[14rem]"
            />
            <button type="button" onClick={join} disabled={busy} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 dark:bg-brand-500">
              {busy ? "Joining..." : "Join class"}
            </button>
            <button
              type="button"
              onClick={() => {
                sessionStorage.setItem(DISMISS_KEY, "1");
                setHidden(true);
              }}
              className="text-xs font-semibold text-slate-500 hover:underline dark:text-slate-400"
            >
              Not now
            </button>
          </div>
          {error && <p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p>}
        </div>
      </div>
    </div>
  );
}
