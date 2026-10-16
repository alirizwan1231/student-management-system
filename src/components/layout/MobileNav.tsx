"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal, X } from "lucide-react";
import { NAV_ITEMS } from "./nav-items";
import { cn } from "@/lib/utils/cn";

// Four main tabs fit comfortably on a phone; everything else lives in "More".
   const PRIMARY = ["/dashboard", "/tasks", "/timetable", "/notes"];

export function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
   // Keep the bar in the order listed in PRIMARY (not the order of NAV_ITEMS).
   const primary = PRIMARY.flatMap((href) => NAV_ITEMS.filter((i) => i.href === href));  const secondary = NAV_ITEMS.filter((i) => !PRIMARY.includes(i.href));
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const moreActive = secondary.some((i) => isActive(i.href));

  useEffect(() => setMoreOpen(false), [pathname]);

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setMoreOpen(false)}>
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-slate-200 bg-white p-4 pb-20 shadow-xl dark:border-slate-800 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-900 dark:text-white">More</p>
              <button type="button" aria-label="Close" onClick={() => setMoreOpen(false)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {secondary.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl px-1 py-3 text-[11px] font-medium",
                    isActive(href)
                      ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                      : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/[0.04]"
                  )}
                >
                  <Icon size={20} aria-hidden="true" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
      <nav
        aria-label="Main navigation"
        className="fixed inset-x-0 bottom-0 z-50 flex justify-around border-t border-slate-200 bg-white py-1 dark:border-slate-800 dark:bg-slate-900 md:hidden"
      >
        {primary.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-label={label}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] font-medium",
              isActive(href) ? "text-brand-700 dark:text-brand-400" : "text-slate-400 dark:text-slate-500"
            )}
          >
            <Icon size={20} aria-hidden="true" />
            {label}
          </Link>
        ))}
        <button
          type="button"
          aria-label="More"
          onClick={() => setMoreOpen((v) => !v)}
          className={cn(
            "flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] font-medium",
            moreActive || moreOpen ? "text-brand-700 dark:text-brand-400" : "text-slate-400 dark:text-slate-500"
          )}
        >
          <MoreHorizontal size={20} aria-hidden="true" />
          More
        </button>
      </nav>
    </>
  );
}
