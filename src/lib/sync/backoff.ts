// Exponential backoff for failed sync-queue entries: 30s, 60s, 120s, ...
// capped at 5 minutes, so a persistently failing entry doesn't get retried
// every single sync cycle but also isn't abandoned forever.

const BASE_MS = 30_000;
const CAP_MS = 5 * 60_000;

export function computeBackoffMs(attempts: number): number {
  return Math.min(BASE_MS * 2 ** attempts, CAP_MS);
}

export function computeNextAttemptAt(attempts: number): string {
  return new Date(Date.now() + computeBackoffMs(attempts)).toISOString();
}

export function isDue(next_attempt_at: string | null): boolean {
  if (!next_attempt_at) return true;
  return new Date(next_attempt_at).getTime() <= Date.now();
}
