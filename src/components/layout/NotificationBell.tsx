"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Bell, FileText, ListChecks, Megaphone, MessageSquare } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { listNotifications, markAllNotificationsRead, markNotificationRead, type NotificationRow } from "@/lib/groups/notifications";
import { cn } from "@/lib/utils/cn";

const ICONS: Record<string, typeof Bell> = {
  shared_item: FileText,
  announcement: Megaphone,
  comment: MessageSquare,
  group_task: ListChecks,
};

// Bell with an unread badge. Shows what happened in your study groups:
// new shared content, announcements, comments and group tasks.
export function NotificationBell({ placement = "down", align = "right" }: { placement?: "up" | "down"; align?: "left" | "right" }) {
  const { user } = useUser();
  const router = useRouter();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    if (!navigator.onLine) return;
    try {
      setItems(await listNotifications());
    } catch {
      /* table missing or offline: keep what we have */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    void refresh();
    const timer = setInterval(() => void refresh(), 60_000);
    const onVisible = () => document.visibilityState === "visible" && void refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user, refresh]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;
  const unread = items.filter((n) => !n.read_at).length;

  const openItem = async (n: NotificationRow) => {
    setOpen(false);
    if (!n.read_at) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
      void markNotificationRead(n.id);
    }
    router.push(`/groups/${n.group_id}`);
  };

  const readAll = async () => {
    setItems((prev) => prev.map((x) => ({ ...x, read_at: x.read_at ?? new Date().toISOString() })));
    await markAllNotificationsRead();
  };

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          void refresh();
        }}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-slate-100"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className={cn(
            "absolute z-50 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-white/[0.1] dark:bg-slate-900",
            placement === "up" ? "bottom-full mb-2" : "top-full mt-2",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-white/[0.06]">
            <p className="text-sm font-bold text-slate-900 dark:text-white">Notifications</p>
            {unread > 0 && (
              <button type="button" onClick={readAll} className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400">
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-4 py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                {loaded ? "Nothing yet. Activity from your study groups will show up here." : "Loading..."}
              </li>
            ) : (
              items.map((n) => {
                const Icon = ICONS[n.type] ?? Bell;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => openItem(n)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.04]",
                        !n.read_at && "bg-brand-50/60 dark:bg-brand-500/[0.07]"
                      )}
                    >
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-300">
                        <Icon size={14} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold text-slate-800 dark:text-slate-100">{n.message}</span>
                        <span className="mt-0.5 block text-[11px] text-slate-400 dark:text-slate-500">
                          {n.groups?.name ?? "Group"} • {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </span>
                      </span>
                      {!n.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}