"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { errorBoxClass, inputClass, labelClass, primaryBtnClass } from "@/components/auth/authStyles";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const send = async () => {
    setError(null);
    const clean = email.trim().toLowerCase();
    if (!EMAIL_RE.test(clean)) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.resetPasswordForEmail(clean, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password`,
    });
    setBusy(false);
    // Do not reveal whether the account exists; only surface real failures.
    if (err && !/not found|no user/i.test(err.message)) {
      setError(err.message);
      return;
    }
    setSent(true);
    setCooldown(60);
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
          <MailCheck size={22} />
        </span>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Check your email</h2>
        <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
          If an account exists for <span className="font-semibold text-slate-700 dark:text-slate-200">{email.trim().toLowerCase()}</span>, we sent a link to reset your password. It expires in one hour.
        </p>
        <button type="button" disabled={cooldown > 0 || busy} onClick={() => void send()} className="mt-1 text-xs font-semibold text-brand-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-brand-400">
          {cooldown > 0 ? `Send again in ${cooldown}s` : "Send the email again"}
        </button>
        <Link href="/login" className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
      className="flex flex-col gap-4"
    >
      <div>
        <label className={labelClass}>Email</label>
        <input type="email" autoComplete="email" autoFocus placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
      </div>
      {error && <p className={errorBoxClass}>{error}</p>}
      <button type="submit" disabled={busy} className={primaryBtnClass}>
        {busy ? "Sending..." : "Send reset link"}
      </button>
    </form>
  );
}
