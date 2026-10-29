import { cn } from "@/lib/utils/cn";

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600 dark:border-slate-700 dark:border-t-brand-400",
        className
      )}
    />
  );
}
