"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "um-install-dismissed-at";
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

// Small dismissible banner that offers "install as an app".
//  - Chrome/Edge/Android: uses the native install prompt.
//  - iPhone/iPad Safari (no install API): shows the Add to Home Screen hint.
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (Date.now() - dismissedAt < SNOOZE_MS) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setHidden(false);
    };
    const onInstalled = () => setHidden(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    const ua = navigator.userAgent;
    const isIos = /iphone|ipad|ipod/i.test(ua) && !/crios|fxios/i.test(ua);
    if (isIos) {
      setShowIosHint(true);
      setHidden(false);
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setHidden(true);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setHidden(true);
    else dismiss();
    setDeferred(null);
  };

  if (hidden || (!deferred && !showIosHint)) return null;

  return (
    <div className="fixed inset-x-3 bottom-20 z-50 mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-lg dark:border-white/[0.1] dark:bg-slate-900 md:bottom-6 md:left-auto md:right-6 md:mx-0">
      <button type="button" onClick={dismiss} aria-label="Dismiss" className="absolute right-2.5 top-2.5 rounded-md p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
        <X size={14} />
      </button>
      <div className="flex items-start gap-3 pr-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white dark:bg-brand-500">
          <Download size={18} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900 dark:text-white">Install University Manager</p>
          {deferred ? (
            <>
              <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">Add it to your device for faster access and offline use.</p>
              <button type="button" onClick={install} className="mt-3 rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-700 dark:bg-brand-500">
                Install app
              </button>
            </>
          ) : (
            <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Tap <Share size={12} className="mx-0.5 inline -translate-y-px" /> Share, then <span className="font-semibold">Add to Home Screen</span>.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
