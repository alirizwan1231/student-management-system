"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema, type SignupInput } from "@/lib/validation/auth";
import { createClient } from "@/lib/supabase/client";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-white/[0.14] dark:focus:border-brand-400 dark:focus:bg-slate-900 dark:focus:ring-brand-500/10";

const labelClass =
  "mb-1.5 block text-xs font-bold uppercase tracking-[0.06em] text-slate-600 dark:text-slate-300";

const errorClass =
  "mt-1.5 text-xs font-medium text-status-overdue";

export function SignupForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (values: SignupInput) => {
    setServerError(null);

    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          full_name: values.fullName,
        },
      },
    });

    if (error) {
      setServerError(error.message);
      return;
    }

    if (!data.session) {
      setConfirmationSent(true);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  };

  if (confirmationSent) {
    return (
      <div className="rounded-2xl border border-brand-200 bg-brand-50/70 p-5 dark:border-brand-500/15 dark:bg-brand-500/[0.06]">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
            <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5">
              <path d="M4 6.5 12 13l8-6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          </div>

          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Check your email</p>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              We&apos;ve sent you a confirmation link. Confirm your account and then sign in.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {/* Full Name */}
      <div>
        <label className={labelClass}>Full name</label>

        <input
          type="text"
          autoComplete="name"
          placeholder="Ali Rizwan"
          className={inputClass}
          {...register("fullName")}
        />

        {errors.fullName && <p className={errorClass}>{errors.fullName.message}</p>}
      </div>

      {/* Email */}
      <div>
        <label className={labelClass}>Email</label>

        <input
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          className={inputClass}
          {...register("email")}
        />

        {errors.email && <p className={errorClass}>{errors.email.message}</p>}
      </div>

      {/* Password */}
      <div>
        <label className={labelClass}>Password</label>

        <input
          type="password"
          autoComplete="new-password"
          placeholder="Create a strong password"
          className={inputClass}
          {...register("password")}
        />

        {errors.password && <p className={errorClass}>{errors.password.message}</p>}
      </div>

      {/* Confirm Password */}
      <div>
        <label className={labelClass}>Confirm password</label>

        <input
          type="password"
          autoComplete="new-password"
          placeholder="Repeat your password"
          className={inputClass}
          {...register("confirmPassword")}
        />

        {errors.confirmPassword && <p className={errorClass}>{errors.confirmPassword.message}</p>}
      </div>

      {/* Server Error */}
      {serverError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 dark:border-rose-500/15 dark:bg-rose-500/[0.06]">
          <div className="flex items-start gap-2.5">
            <svg viewBox="0 0 24 24" fill="none" className="mt-0.5 h-4 w-4 shrink-0 text-rose-500">
              <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path
                d="m10.3 4.8-6.6 11.4A2 2 0 0 0 5.4 19h13.2a2 2 0 0 0 1.7-2.8L13.7 4.8a2 2 0 0 0-3.4 0Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
            </svg>

            <p className="text-xs font-medium leading-5 text-rose-600 dark:text-rose-400">{serverError}</p>
          </div>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="group mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-[1px] hover:bg-brand-700 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-brand-500 dark:hover:bg-brand-400"
      >
        {isSubmitting ? (
          <>
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" className="opacity-30" />
              <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Creating account...
          </>
        ) : (
          <>
            <span>Create account</span>
            <svg
              viewBox="0 0 20 20"
              fill="none"
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
            >
              <path d="M4 10h11M11 5l5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </>
        )}
      </button>
    </form>
  );
}
