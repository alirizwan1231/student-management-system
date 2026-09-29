"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  profileSchema,
  type ProfileInput,
} from "@/lib/validation/profile";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-white/[0.14] dark:focus:border-brand-400 dark:focus:bg-slate-900 dark:focus:ring-brand-500/10";

const labelClass =
  "mb-1.5 block text-xs font-bold uppercase tracking-[0.06em] text-slate-600 dark:text-slate-300";

export function ProfileForm() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    if (!user) return;

    const supabase = createClient();

    (supabase.from("profiles") as any)
      .select("full_name")
      .eq("id", user.id)
      .single()
      .then(({ data }: { data: { full_name: string | null } | null }) => {
        reset({
          full_name: data?.full_name ?? "",
        });

        setLoading(false);
      });
  }, [user, reset]);

  const onSubmit = async (values: ProfileInput) => {
    if (!user) return;

    setSaved(false);

    const supabase = createClient();

    await (supabase.from("profiles") as any)
      .update({
        full_name: values.full_name,
      })
      .eq("id", user.id);

    setSaved(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-[160px] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-md space-y-5">
      {/* Full Name */}
      <div>
        <label className={labelClass}>Full name</label>

        <input
          type="text"
          autoComplete="name"
          placeholder="Your full name"
          className={inputClass}
          {...register("full_name")}
        />

        {errors.full_name && (
          <p className="mt-1.5 text-xs font-medium text-status-overdue">
            {errors.full_name.message}
          </p>
        )}
      </div>

      {/* Email */}
      <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3.5 dark:border-white/[0.06] dark:bg-white/[0.02]">
        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">
          Email address
        </p>

        <div className="mt-1 flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-slate-400">
            <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
            <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>

          <p className="truncate text-sm font-medium text-slate-600 dark:text-slate-300">{user?.email}</p>
        </div>

        <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
          Your email address cannot be changed here.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="group inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-[1px] hover:bg-brand-700 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-brand-500 dark:hover:bg-brand-400"
        >
          {isSubmitting ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" className="opacity-30" />
                <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Saving...
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                <path d="M5 12.5 9.5 17 19 7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Save changes
            </>
          )}
        </button>

        {saved && (
          <div className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
              <path d="m4 10 4 4 8-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Saved successfully
          </div>
        )}
      </div>
    </form>
  );
}