"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserRound, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";

const DISMISS_KEY = "um-name-prompt-dismissed";

// Shown when your profile has no proper name yet, so your study group can
// recognise you. Disappears once you save a name in Profile.
export function NamePrompt() {
  const { user } = useUser();
  const [needsName, setNeedsName] = useState(false);

  useEffect(() => {
    if (!user || !navigator.onLine || sessionStorage.getItem(DISMISS_KEY)) return;
    let cancelled = false;
    createClient()
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const name = (data?.full_name ?? "").trim();
        if (!cancelled) setNeedsName(!name || name.includes("@"));
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!needsName) return null;

  return (
    <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/[0.08]">
      <UserRound size={18} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-amber-900 dark:text-amber-100">Add your name</p>
        <p className="mt-0.5 text-xs leading-5 text-amber-800/80 dark:text-amber-200/70">
          People in your study groups cannot tell who you are yet. Add your name so they can recognise you.
        </p>
        <Link href="/profile" className="mt-2 inline-block rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700">
          Add my name
        </Link>
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => {
          sessionStorage.setItem(DISMISS_KEY, "1");
          setNeedsName(false);
        }}
        className="rounded-md p-1 text-amber-700/60 hover:text-amber-900 dark:text-amber-300/60"
      >
        <X size={14} />
      </button>
    </div>
  );
}