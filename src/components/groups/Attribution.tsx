import { cn } from "@/lib/utils/cn";

const COLORS = ["bg-rose-500", "bg-orange-500", "bg-amber-500", "bg-emerald-500", "bg-teal-500", "bg-sky-500", "bg-indigo-500", "bg-violet-500", "bg-fuchsia-500"];

function colorFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

function initials(name?: string | null) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function Avatar({ name, avatarUrl, id, size = 24 }: { name?: string | null; avatarUrl?: string | null; id: string; size?: number }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.42) };
  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatarUrl} alt={name ?? "Member"} style={style} className="shrink-0 rounded-full object-cover" referrerPolicy="no-referrer" />;
  }
  return (
    <span style={style} className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white", colorFor(id))} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

// "[picture] Created by Ali Raza • 17 Oct 2026". Works for old and new records: it only needs the
// user id stored on the record, the name/picture come from the group's member profiles.
export function Attribution({
  prefix,
  name,
  avatarUrl,
  userId,
  date,
  className,
}: {
  prefix: string;
  name?: string | null;
  avatarUrl?: string | null;
  userId: string;
  date?: string;
  className?: string;
}) {
  const shown = name || "Unnamed member";
  return (
    <div className={cn("flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400", className)}>
      <Avatar name={name} avatarUrl={avatarUrl} id={userId} />
      <span className="min-w-0 truncate">
        {prefix} <span className="font-semibold text-slate-700 dark:text-slate-200">{shown}</span>
        {date ? ` • ${new Date(date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}` : ""}
      </span>
    </div>
  );
}
