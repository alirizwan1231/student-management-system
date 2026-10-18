import { getMeta, setMeta } from "@/lib/db/repo/meta";

// Wraps a read function: on success the result is cached locally; if the
// network is unavailable the last cached result is returned instead, so
// groups, members, shared items, announcements and comments can still be
// read offline. Writes (posting, voting, joining) still require internet.
function isNetworkFailure(err: unknown) {
  return (typeof navigator !== "undefined" && !navigator.onLine) || err instanceof TypeError;
}

export function withReadCache<A extends unknown[], R>(name: string, fn: (...args: A) => Promise<R>): (...args: A) => Promise<R> {
  return async (...args: A) => {
    const key = `rc:${name}:${JSON.stringify(args)}`;
    try {
      const result = await fn(...args);
      void setMeta(key, JSON.stringify(result ?? null)).catch(() => undefined);
      return result;
    } catch (err) {
      if (isNetworkFailure(err)) {
        const cached = await getMeta(key).catch(() => null);
        if (cached !== null) return JSON.parse(cached) as R;
      }
      throw err;
    }
  };
}
