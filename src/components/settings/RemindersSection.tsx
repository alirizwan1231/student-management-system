"use client";

import { useEffect, useState } from "react";
import { Bell, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { REMINDERS_ENABLED_KEY, showNotification } from "@/lib/reminders/storage";
import { cn } from "@/lib/utils/cn";

function Toggle({ on, onChange, disabled, label }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50", on ? "bg-brand-600 dark:bg-brand-500" : "bg-slate-300 dark:bg-white/[0.15]")}
    >
      <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", on ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}

export function RemindersSection() {
  const { user } = useUser();
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [browserOn, setBrowserOn] = useState(false);
  const [digest, setDigest] = useState<boolean | null>(null); // null = unknown / unavailable
  const [digestError, setDigestError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof Notification === "undefined") {
      setSupported(false);
      return;
    }
    setPermission(Notification.permission);
    setBrowserOn(localStorage.getItem(REMINDERS_ENABLED_KEY) === "1" && Notification.permission === "granted");
  }, []);

  useEffect(() => {
    if (!user) return;
    createClient()
      .from("notification_prefs")
      .select("email_digest")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) return setDigestError("Email digest is unavailable (run migration 019 in Supabase).");
        setDigest(Boolean(data?.email_digest));
      });
  }, [user]);

  const toggleBrowser = async (next: boolean) => {
    setMessage(null);
    if (!next) {
      localStorage.setItem(REMINDERS_ENABLED_KEY, "0");
      return setBrowserOn(false);
    }
    const result = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      localStorage.setItem(REMINDERS_ENABLED_KEY, "1");
      setBrowserOn(true);
      await showNotification("Reminders are on", "You will be notified about deadlines, exams and classes.", "/dashboard", "um-welcome").catch(() => undefined);
    } else {
      setMessage("Notifications are blocked. Allow them in your browser's site settings, then try again.");
    }
  };

  const toggleDigest = async (next: boolean) => {
    if (!user) return;
    setDigest(next);
    const { error } = await createClient().from("notification_prefs").upsert({ user_id: user.id, email_digest: next, updated_at: new Date().toISOString() });
    if (error) {
      setDigest(!next);
      setMessage("Could not save this setting. Check your connection.");
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025]">
      <div className="border-b border-slate-100 px-5 py-4 dark:border-white/[0.06]">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">Reminders</h2>
        <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">Never miss a deadline, exam or class.</p>
      </div>
      <div className="space-y-5 px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Bell size={18} className="mt-0.5 shrink-0 text-brand-600 dark:text-brand-400" />
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Device notifications</p>
              <p className="text-xs leading-5 text-slate-400 dark:text-slate-500">
                Tasks due within 24 hours, exams (3 days, 1 day, same day) and classes starting in 15 minutes. Works while the app is open or installed.
              </p>
              {permission === "denied" && <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">Blocked in your browser settings.</p>}
              {!supported && <p className="mt-1 text-xs font-medium text-slate-400">This browser does not support notifications.</p>}
            </div>
          </div>
          <Toggle on={browserOn} onChange={toggleBrowser} disabled={!supported} label="Device notifications" />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Mail size={18} className="mt-0.5 shrink-0 text-brand-600 dark:text-brand-400" />
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Daily email digest</p>
              <p className="text-xs leading-5 text-slate-400 dark:text-slate-500">One morning email with overdue tasks, tasks due in the next 2 days and exams in the next 7 days. Works even when the app is closed.</p>
              {digestError && <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">{digestError}</p>}
              {!digestError && digest === null && <p className="mt-1 text-xs font-medium text-slate-400 dark:text-slate-500">Loading your email preference...</p>}
              {!digestError && digest !== null && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Delivered by the morning email job; it needs the email setup in the step-by-step guide to be working.</p>}
            </div>
          </div>
          <Toggle on={digest === true} onChange={toggleDigest} disabled={digest === null} label="Daily email digest" />
        </div>
        {message && <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{message}</p>}
      </div>
    </section>
  );
}
