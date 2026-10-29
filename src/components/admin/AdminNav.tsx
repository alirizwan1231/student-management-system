"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Search, ScrollText, ArrowLeft, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
const ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/search", label: "Search", icon: Search },
  { href: "/admin/audit", label: "Audit Log", icon: ScrollText },
];
export function AdminNav() {
  const pathname = usePathname();
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-white/[0.08]">
      <nav className="flex flex-wrap gap-1">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.06]"
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>
      <Link href="/dashboard" className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
        <ArrowLeft size={14} />
        Back to app
      </Link>
    </div>
  );
}
