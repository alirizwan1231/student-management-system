// Connectivity detection beyond navigator.onLine, which can lie (e.g. a
// captive portal reports "online" with no real internet). We back it up
// with a lightweight reachability ping against the Supabase project's
// health endpoint, with a short timeout so a bad connection doesn't hang
// the sync loop.

export function browserReportsOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

export async function checkReachability(timeoutMs = 4000): Promise<boolean> {
  if (!browserReportsOnline()) return false;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return false;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Supabase exposes a lightweight auth health endpoint; any response
    // (even 4xx) proves the network path is actually up.
    const res = await fetch(`${url}/auth/v1/health`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });
    return res.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function onConnectivityChange(callback: (online: boolean) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onOnline = () => callback(true);
  const onOffline = () => callback(false);
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
  return () => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
  };
}
