"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { SyncStatus } from "@/types/academic";
import { runSyncCycle } from "@/lib/sync/engine";
import { onConnectivityChange, browserReportsOnline } from "@/lib/sync/connectivity";
import { onSyncRequested } from "@/lib/sync/bus";
import { useUser } from "@/hooks/useUser";

interface SyncContextValue {
  status: SyncStatus;
  lastSyncedAt: string | null;
  triggerSync: () => void;
}

const SyncContext = createContext<SyncContextValue>({
  status: "offline",
  lastSyncedAt: null,
  triggerSync: () => {},
});

const AUTO_SYNC_INTERVAL_MS = 30_000;

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const [status, setStatus] = useState<SyncStatus>(browserReportsOnline() ? "online" : "offline");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const runningRef = useRef(false);
  const pendingRef = useRef(false);

  const triggerSync = useCallback(() => {
    if (!user) return;
    if (runningRef.current) {
      // A write arrived mid-cycle -- run once more right after this one
      // finishes, instead of dropping it until the next interval tick.
      pendingRef.current = true;
      return;
    }
    runningRef.current = true;
    setStatus("syncing");
    runSyncCycle(user.id)
      .then((result) => {
        setStatus(result.status);
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

  useEffect(() => {
    if (!user) return;

    triggerSync();

    const unsubscribeConnectivity = onConnectivityChange((online) => {
      if (online) triggerSync();
      else setStatus("offline");
    });

    // Fires immediately whenever any repo function enqueues a change.
    const unsubscribeBus = onSyncRequested(() => triggerSync());

    const interval = setInterval(() => {
      if (browserReportsOnline()) triggerSync();
    }, AUTO_SYNC_INTERVAL_MS);

    return () => {
      unsubscribeConnectivity();
      unsubscribeBus();
      clearInterval(interval);
    };
  }, [user, triggerSync]);

  return (
    <SyncContext.Provider value={{ status, lastSyncedAt, triggerSync }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSyncStatus() {
  return useContext(SyncContext);
}
