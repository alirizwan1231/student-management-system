"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav-items";
import { cn } from "@/lib/utils/cn";
import { useUser } from "@/hooks/useUser";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Shield } from "lucide-react";
import { AddTaskModal } from "@/components/tasks/AddTaskModal";
import { AddSubjectModal } from "@/components/subjects/AddSubjectModal";
import { AddNotesButton } from "@/components/notes/AddNotesButton";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { SyncStatusIndicator } from "@/components/sync/SyncStatusIndicator";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { GlobalSearchModal } from "@/components/search/GlobalSearchModal";

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const isAdmin = useIsAdmin(user?.id);

  return (
    <nav
      aria-label="Main navigation"
      className="hidden w-56 shrink-0 flex-col gap-1 border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:flex"
    >
      <p className="mb-4 px-2 font-display text-lg font-semibold text-brand-700 dark:text-brand-400">
        University Manager
      </p>

      {user && (
        <>
          <div className="mb-3 px-2">
            <GlobalSearchModal />
          </div>
          <div className="mb-4 flex flex-col gap-2 px-2">
            <AddTaskModal userId={user.id} fullWidth />
            <AddNotesButton fullWidth />
            <AddSubjectModal userId={user.id} fullWidth />
          </div>
        </>
      )}

      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400",
              active
                ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            )}
          >
            <Icon size={18} aria-hidden="true" />
            {label}
          </Link>
        );
      })}

      {isAdmin && (
        <Link
          href="/admin"
          className={cn(
            "mt-2 flex items-center gap-2 rounded-xl border border-brand-200 px-3 py-2 text-sm font-semibold transition dark:border-brand-500/30",
            pathname.startsWith("/admin")
              ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
              : "text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-900/30"
          )}
        >
          <Shield size={18} aria-hidden="true" />
          Admin panel
        </Link>
      )}

      <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <NotificationBell placement="up" align="left" />
        </div>
        <SyncStatusIndicator />
      </div>
    </nav>
  );
}
