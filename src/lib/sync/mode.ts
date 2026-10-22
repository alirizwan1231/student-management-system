// The user's chosen working mode, separate from whether the internet actually works.
//  - "online":  sync automatically whenever a connection exists (default)
//  - "offline": work locally only; nothing is uploaded or downloaded until the user switches back
export type AppMode = "online" | "offline";

const KEY = "um-app-mode";
const listeners = new Set<() => void>();

export function getAppMode(): AppMode {
  try {
    return localStorage.getItem(KEY) === "offline" ? "offline" : "online";
  } catch {
    return "online";
  }
}

export function setAppMode(mode: AppMode) {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    /* storage blocked: the choice only lasts for this visit */
  }
  listeners.forEach((l) => l());
}

export function subscribeMode(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => e.key === KEY && listener(); // another tab changed it
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
