import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-4 flex flex-wrap items-center gap-1 text-xs font-medium text-slate-400 dark:text-slate-500"
    >
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1">
          {index > 0 && <ChevronRight size={12} aria-hidden="true" />}
          {item.href ? (
            <Link href={item.href} className="truncate transition-colors hover:text-brand-600 dark:hover:text-brand-400">
              {item.label}
            </Link>
          ) : (
            <span className="max-w-[220px] truncate text-slate-600 dark:text-slate-300">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
