"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { useUser } from "@/hooks/useUser";
import { classPackUrl, joinErrorMessage, joinWithCode, setPendingJoin } from "@/lib/groups/pendingJoin";

// Opened from the invite link the class representative shares: /join/<code>
export default function JoinPage({ params }: { params: { code: string } }) {
  const code = decodeURIComponent(params.code);
  const router = useRouter();
  const { user, loading } = useUser();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    setPendingJoin(code); // remembered through sign-up / login
  }, [code]);

  useEffect(() => {
    if (!user || started.current) return;
    started.current = true;
    joinWithCode(code)
      .then((group) => router.replace(classPackUrl(group.id)))
      .catch((err) => setError(joinErrorMessage(err)));
  }, [user, code, router]);

  if (user) {
    return (
      <AuthShell title={error ? "Could not join" : "Joining your class..."} subtitle={error ?? "One moment, taking you to the class pack."}>
        {error && (
          <Link href="/dashboard" className="block rounded-xl bg-brand-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-700 dark:bg-brand-500">
            Go to my dashboard
          </Link>
        )}
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Join your class" subtitle="Your class representative invited you. Create an account (or sign in) and you will be added automatically, with all the subjects and the timetable ready to import.">
      <p className="mb-4 rounded-xl bg-slate-50 p-3 text-center text-xs text-slate-500 dark:bg-white/[0.04] dark:text-slate-400">
        Class code: <span className="font-mono font-bold text-slate-700 dark:text-slate-200">{code}</span>
      </p>
      {loading ? null : (
        <div className="flex flex-col gap-2.5">
          <Link href="/signup" className="rounded-xl bg-brand-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-700 dark:bg-brand-500">
            Create my account
          </Link>
          <Link href="/login" className="rounded-xl border border-slate-200 px-4 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5">
            I already have an account
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
