"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  return (
    <button
      onClick={handleSignOut}
      className="
        group inline-flex items-center justify-center gap-2
        rounded-xl border border-slate-200
        bg-white px-3.5 py-2
        text-sm font-semibold text-slate-600
        shadow-sm transition-all duration-200
        hover:-translate-y-[1px]
        hover:border-rose-200 hover:bg-rose-50
        hover:text-rose-600 hover:shadow-md
        active:translate-y-0 active:shadow-sm
        focus:outline-none focus:ring-4 focus:ring-rose-500/10
        dark:border-white/[0.08]
        dark:bg-white/[0.03]
        dark:text-slate-300
        dark:hover:border-rose-500/20
        dark:hover:bg-rose-500/10
        dark:hover:text-rose-400
      "
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
      >
        <path d="M10 17l5-5-5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 12H4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M20 4v16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>

      <span>Sign out</span>
    </button>
  );
}
