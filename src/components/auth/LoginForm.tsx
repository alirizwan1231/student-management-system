"use client";

import { useState } from "react";
import { KeyRound, Mail } from "lucide-react";
import { PasswordLoginForm } from "@/components/auth/PasswordLoginForm";
import { OtpLoginForm } from "@/components/auth/OtpLoginForm";
import { cn } from "@/lib/utils/cn";

export function LoginForm() {
  const [mode, setMode] = useState<"password" | "code">("password");
  const tabs = [
    { id: "password" as const, label: "Password", icon: KeyRound },
    { id: "code" as const, label: "Email code", icon: Mail },
  ];
  return (
    <div>
      <div role="tablist" className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-white/[0.05]">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={mode === id}
            onClick={() => setMode(id)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all",
              mode === id
                ? "bg-white text-brand-700 shadow-sm dark:bg-slate-800 dark:text-brand-300"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>
      {mode === "password" ? <PasswordLoginForm /> : <OtpLoginForm />}
    </div>
  );
}
