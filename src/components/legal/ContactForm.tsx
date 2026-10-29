"use client";

import { useState } from "react";
import { errorBoxClass, inputClass, labelClass, primaryBtnClass, successBoxClass } from "@/components/auth/authStyles";

export function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", message: "", website: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not send your message.");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your message.");
    } finally {
      setBusy(false);
    }
  };

  if (sent) return <p className={successBoxClass}>Thanks! Your message was sent. We will reply to {form.email}.</p>;

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/[0.07] dark:bg-slate-900">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Your name</label>
          <input value={form.name} onChange={(e) => set("name", e.target.value)} className={inputClass} autoComplete="name" />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={inputClass} autoComplete="email" />
        </div>
      </div>
      <div>
        <label className={labelClass}>Message</label>
        <textarea rows={6} value={form.message} onChange={(e) => set("message", e.target.value)} className={inputClass} placeholder="How can we help?" />
      </div>
      {/* Honeypot: hidden from people, filled by bots */}
      <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set("website", e.target.value)} className="hidden" aria-hidden="true" />
      {error && <p className={errorBoxClass}>{error}</p>}
      <button type="submit" disabled={busy} className={primaryBtnClass}>{busy ? "Sending..." : "Send message"}</button>
    </form>
  );
}
