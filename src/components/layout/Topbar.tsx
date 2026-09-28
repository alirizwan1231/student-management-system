"use client";

import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { SyncStatusIndicator } from "@/components/sync/SyncStatusIndicator";

// Mobile-only sticky header. Desktop shows the same two controls in the
// Sidebar footer instead (see Sidebar.tsx) -- having both a fixed overlay
// AND page headers competing for the same top-right corner was the main
// visual bug reported, so this replaces that floating overlay entirely.
export function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 md:hidden">
      <p className="font-display text-base font-semibold text-brand-700 dark:text-brand-400">
        University Manager
      </p>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <SyncStatusIndicator compact />
      </div>
    </header>
  );
}
