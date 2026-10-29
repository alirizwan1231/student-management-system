"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { errorBoxClass, inputClass, labelClass, primaryBtnClass, successBoxClass } from "@/components/auth/authStyles";
import { PasswordChecklist } from "@/components/auth/PasswordChecklist";
import { strongPasswordSchema } from "@/lib/validation/auth";

export function ChangePasswordSection() {
  const { user } = useUser();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (!user?.email) return setError("You need to be signed in with an email account.");
    if (!current) return setError("Enter your current password.");
    // Fix 9: same rule as signup (min 10, letter + number, not common).
    const pwCheck = strongPasswordSchema.safeParse(next);
    if (!pwCheck.success) return setError(pwCheck.error.issues[0]?.message ?? "Choose a stronger password.");
    if (next === current) return setError("New password must be different from the current one.");
    if (next !== confirm) return setError("New passwords do not match.");
    if (!navigator.onLine) return setError("You are offline. Connect to the internet to change your password.");

    setBusy(true);
    const supabase = createClient();
    // Re-check the current password first, so someone using an unlocked
    // device cannot silently change it.
    const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email, password: current });
    if (verifyError) {
      setBusy(false);
      return setError("Your current password is incorrect.");
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: next });
    setBusy(false);
    if (updateError) return setError(updateError.message);
    setCurrent("");
    setNext("");
    setConfirm("");
    setDone(true);
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025]">
      <div className="border-b border-slate-100 px-5 py-4 dark:border-white/[0.06]">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          <KeyRound size={15} className="text-brand-600 dark:text-brand-400" />
          Change password
        </h2>
        <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
          Forgot your current password?{" "}
          <Link href="/forgot-password" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">Reset it by email</Link>.
        </p>
      </div>
      <form onSubmit={submit} className="space-y-4 px-5 py-4">
        <div>
          <label className={labelClass}>Current password</label>
          <input type={show ? "text" : "password"} autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={inputClass} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>New password</label>
            <input type={show ? "text" : "password"} autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="At least 10 characters" className={inputClass} />
            <PasswordChecklist value={next} />
          </div>
          <div>
            <label className={labelClass}>Confirm new password</label>
            <input type={show ? "text" : "password"} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} />
          </div>
        </div>
        <button type="button" onClick={() => setShow((v) => !v)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
          {show ? "Hide passwords" : "Show passwords"}
        </button>
        {error && <p className={errorBoxClass}>{error}</p>}
        {done && <p className={successBoxClass}>Password updated. Use the new password next time you sign in.</p>}
        <button type="submit" disabled={busy} className={`${primaryBtnClass} sm:w-auto sm:px-6`}>
          {busy ? "Updating..." : "Update password"}
        </button>
      </form>
    </section>
  );
}
