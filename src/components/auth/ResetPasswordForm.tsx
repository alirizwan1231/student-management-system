"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { errorBoxClass, inputClass, labelClass, primaryBtnClass } from "@/components/auth/authStyles";

function strength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 14) s++;
  return s; // 0..4
}
const STRENGTH_LABEL = ["Too short", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLOR = ["bg-slate-300", "bg-rose-500", "bg-amber-500", "bg-lime-500", "bg-emerald-500"];

export function ResetPasswordForm() {
  const router = useRouter();
  const [ready, setReady] = useState<"loading" | "ok" | "invalid">("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setReady(data.user ? "ok" : "invalid"))
      .catch(() => setReady("invalid"));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setBusy(true);
    const { error: err } = await createClient().auth.updateUser({ password });
    setBusy(false);
    if (err) return setError(err.message);
    setDone(true);
    setTimeout(() => {
      router.replace("/dashboard");
      router.refresh();
    }, 1500);
  };

  if (ready === "loading") return <div className="h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-white/[0.04]" />;

  if (ready === "invalid") {
    return (
      <div className="flex flex-col gap-4 text-center">
        <p className={errorBoxClass}>This reset link is invalid or has expired.</p>
        <Link href="/forgot-password" className={primaryBtnClass}>Request a new link</Link>
      </div>
    );
  }

  if (done) {
    return <p className="rounded-xl bg-emerald-50 px-4 py-5 text-center text-sm font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">Password updated. Taking you to your dashboard...</p>;
  }

  const s = strength(password);
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <label className={labelClass}>New password</label>
        <div className="relative">
          <input type={show ? "text" : "password"} autoComplete="new-password" autoFocus placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputClass} pr-10`} />
          <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {password && (
          <div className="mt-2">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((i) => (
                <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= s ? STRENGTH_COLOR[s] : "bg-slate-200 dark:bg-white/[0.08]"}`} />
              ))}
            </div>
            <p className="mt-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">{STRENGTH_LABEL[s]}</p>
          </div>
        )}
      </div>
      <div>
        <label className={labelClass}>Confirm password</label>
        <input type={show ? "text" : "password"} autoComplete="new-password" placeholder="Repeat the password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} />
      </div>
      {error && <p className={errorBoxClass}>{error}</p>}
      <button type="submit" disabled={busy} className={primaryBtnClass}>{busy ? "Saving..." : "Update password"}</button>
    </form>
  );
}
