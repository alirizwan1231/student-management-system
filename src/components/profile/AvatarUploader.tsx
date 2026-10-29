"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { useToast } from "@/components/ui/Toast";
import { Avatar } from "@/components/groups/Attribution";
import { photoToAvatarDataUrl } from "@/lib/profile/avatar";
import { getMyProfile, saveMyAvatar } from "@/lib/profile/avatarApi";

// Profile picture: pick a photo, it is cropped to a square and shrunk automatically.
export function AvatarUploader() {
  const { user } = useUser();
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !navigator.onLine) return;
    let cancelled = false;
    getMyProfile(user.id).then((p) => {
      if (cancelled || !p) return;
      setName(p.full_name);
      setAvatar(p.avatar_url);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow choosing the same photo again
    if (!file || !user) return;
    setError(null);
    if (!navigator.onLine) return setError("You are offline. Connect to the internet to change your photo.");
    setBusy(true);
    try {
      const dataUrl = await photoToAvatarDataUrl(file);
      await saveMyAvatar(user.id, dataUrl);
      setAvatar(dataUrl);
      showToast("Profile photo updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the photo.");
    }
    setBusy(false);
  };

  const onRemove = async () => {
    if (!user || !confirm("Remove your profile photo?")) return;
    setError(null);
    setBusy(true);
    try {
      await saveMyAvatar(user.id, null);
      setAvatar(null);
      showToast("Profile photo removed.");
    } catch {
      setError("Could not remove the photo. Please try again.");
    }
    setBusy(false);
  };

  if (!user) return null;

  return (
    <section className="mb-6 flex flex-col items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025] sm:flex-row sm:items-center">
      <Avatar id={user.id} name={name} avatarUrl={avatar} size={80} />
      <div className="min-w-0 text-center sm:text-left">
        <p className="text-sm font-bold text-slate-900 dark:text-white">Profile photo</p>
        <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">Your study group sees this photo next to your name on announcements, notes and polls.</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
          <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60 dark:bg-brand-500">
            <Camera size={14} />
            {busy ? "Saving..." : avatar ? "Change photo" : "Upload photo"}
          </button>
          {avatar && (
            <button type="button" onClick={onRemove} disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60 dark:border-white/10 dark:text-rose-400 dark:hover:bg-white/5">
              <Trash2 size={14} />
              Remove
            </button>
          )}
        </div>
        {error && <p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p>}
      </div>
    </section>
  );
}
