// Plain pub/sub so repo functions (which run outside the React tree) can
// ask the sync engine to run soon after a local write, instead of waiting
// for the ~30s interval in context.tsx. This is the fix for "task added but
// not synced yet" -- every enqueueChange() call now publishes here.
type Listener = () => void;
let listeners: Listener[] = [];

export function onSyncRequested(cb: Listener): () => void {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

export function requestSync(): void {
  listeners.forEach((l) => l());
}
