"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { errorBoxClass, inputClass, labelClass, primaryBtnClass, successBoxClass } from "@/components/auth/authStyles";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Passwordless sign-in: we email a one-time code, the user types it here.
export function OtpLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const sendCode = async () => {
    setError(null);
    setInfo(null);
    const clean = email.trim().toLowerCase();
    if (!EMAIL_RE.test(clean)) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOtp({ email: clean, options: { shouldCreateUser: false } });
    setBusy(false);
    // Fix 2 (audit H-1): never reveal whether an account exists for this
    // email, and never show the raw API error. Always advance to the code
    // step with the same message; if no account/mail exists, no code will
    // arrive and verification simply will not succeed. Real errors are
    // logged for the operator only.
    if (err) console.error("Email-code request failed:", err.message);
    setEmail(clean);
    setStep("code");
    setCooldown(30);
    setInfo("If an account exists for this email, we sent a sign-in code to it.");
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const token = code.replace(/\s/g, "");
    if (!/^\d{6,8}$/.test(token)) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    setBusy(false);
    if (err) {
      setError(/expired|invalid/i.test(err.message) ? "That code is wrong or has expired. Request a new one." : err.message);
      return;
    }
    const to = params.get("redirectedFrom") || "/dashboard";
    router.replace(to.startsWith("/") && !to.startsWith("//") ? to : "/dashboard");
    router.refresh();
  };

  if (step === "email") {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void sendCode();
        }}
        className="flex flex-col gap-4"
      >
        <div>
          <label className={labelClass}>Email</label>
          <input type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">No password needed. We will email you a one-time code.</p>
        </div>
        {error && <p className={errorBoxClass}>{error}</p>}
        <button type="submit" disabled={busy} className={primaryBtnClass}>
          {busy ? "Sending code..." : "Email me a code"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={verify} className="flex flex-col gap-4">
      <div className="flex items-start gap-3 rounded-xl bg-brand-50 p-3.5 dark:bg-brand-500/10">
        <MailCheck size={18} className="mt-0.5 shrink-0 text-brand-600 dark:text-brand-400" />
        <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">
          Code sent to <span className="font-semibold text-slate-800 dark:text-slate-100">{email}</span>. Check your inbox (and spam folder).
        </p>
      </div>
      <div>
        <label className={labelClass}>Verification code</label>
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={8}
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, ""))}
          className={`${inputClass} text-center text-xl font-bold tracking-[0.5em]`}
        />
      </div>
      {error && <p className={errorBoxClass}>{error}</p>}
      {info && !error && <p className={successBoxClass}>{info}</p>}
      <button type="submit" disabled={busy || code.length < 6} className={primaryBtnClass}>
        {busy ? "Verifying..." : "Verify and sign in"}
      </button>
      <div className="flex items-center justify-between text-xs">
        <button type="button" onClick={() => { setStep("email"); setCode(""); setError(null); setInfo(null); }} className="font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
          Use a different email
        </button>
        <button type="button" disabled={cooldown > 0 || busy} onClick={() => void sendCode()} className="font-semibold text-brand-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-brand-400">
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
      </div>
    </form>
  );
}
