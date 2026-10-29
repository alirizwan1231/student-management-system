"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { SyncStatus } from "@/types/academic";
import { runSyncCycle } from "@/lib/sync/engine";
import { onConnectivityChange, browserReportsOnline } from "@/lib/sync/connectivity";
import { onSyncRequested } from "@/lib/sync/bus";
import { repairLocalData } from "@/lib/sync/repair";
import { getAppMode, setAppMode, subscribeMode, type AppMode } from "@/lib/sync/mode";
import { useUser } from "@/hooks/useUser";

interface SyncContextValue {
  status: SyncStatus; // what to show: offline | online | syncing | synced | sync_failed
  mode: AppMode; // what the user chose
  setMode: (mode: AppMode) => void;
  networkOnline: boolean; // what is really true: the internet works
  lastSyncedAt: string | null;
  triggerSync: () => void;
}

const SyncContext = createContext<SyncContextValue>({
  status: "offline",
  mode: "online",
  setMode: () => {},
  networkOnline: false,
  lastSyncedAt: null,
  triggerSync: () => {},
});

const AUTO_SYNC_INTERVAL_MS = 20_000;
const HEALTH_INTERVAL_MS = 30_000;

async function serverReachable(): Promise<boolean> {
  if (!browserReportsOnline()) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch("/api/health", { cache: "no-store", signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const mode = useSyncExternalStore(subscribeMode, getAppMode, () => "online" as AppMode);
  const [networkOnline, setNetworkOnline] = useState<boolean>(browserReportsOnline());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("online");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const runningRef = useRef(false);
  const pendingRef = useRef(false);

  const triggerSync = useCallback(() => {
    if (!user) return;
    if (getAppMode() === "offline" || !browserReportsOnline()) return; // the engine also checks, this just avoids a flicker
    if (runningRef.current) {
      // A write arrived mid-cycle -- run once more right after this one finishes.
      pendingRef.current = true;
      return;
    }
    runningRef.current = true;
    setSyncStatus("syncing");
    runSyncCycle(user.id)
      .then((result) => {
        setSyncStatus(result.status);
        if (result.status === "synced") setLastSyncedAt(new Date().toISOString());
      })
      .finally(() => {
        runningRef.current = false;
        if (pendingRef.current) {
          pendingRef.current = false;
          setTimeout(() => triggerSync(), 0);
        }
      });
  }, [user]);

  const setMode = useCallback((next: AppMode) => {
    setAppMode(next); // saved on this device, so it is still chosen after a refresh
  }, []);

  // Going online (by the user, or the choice was made in another tab) syncs everything that is waiting.
  useEffect(() => {
    if (mode === "online") triggerSync();
  }, [mode, triggerSync]);

  // Real internet check: the browser flag alone can lie (captive portals, dead Wi-Fi).
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const ok = await serverReachable();
      if (!cancelled) setNetworkOnline(ok);
      return ok;
    };
    void check();
    const timer = setInterval(() => void check(), HEALTH_INTERVAL_MS);
    const unsubscribe = onConnectivityChange(async (online) => {
      if (!online) return setNetworkOnline(false);
      if (await check()) triggerSync(); // the connection came back: sync automatically
    });
    return () => {
      cancelled = true;
      clearInterval(timer);
      unsubscribe();
    };
  }, [triggerSync]);

  useEffect(() => {
    if (!user) return;

    // One-time clean-up of rows/uploads that were stuck because of empty "" values, then sync.
    void repairLocalData().finally(() => triggerSync());

    // Fires immediately whenever any repo function enqueues a change or a file.
    const unsubscribeBus = onSyncRequested(() => triggerSync());
    const interval = setInterval(() => triggerSync(), AUTO_SYNC_INTERVAL_MS);

    // Switching back to this tab/app (e.g. after adding something on your phone) syncs right away.
    const onVisible = () => document.visibilityState === "visible" && triggerSync();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      unsubscribeBus();
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [user, triggerSync]);

  const status: SyncStatus = mode === "offline" || !networkOnline ? "offline" : syncStatus;

  return <SyncContext.Provider value={{ status, mode, setMode, networkOnline, lastSyncedAt, triggerSync }}>{children}</SyncContext.Provider>;
}

export function useSyncStatus() {
  return useContext(SyncContext);
}
