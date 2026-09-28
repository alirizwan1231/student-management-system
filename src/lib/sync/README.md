# Sync engine

Implemented in batch 10. Will expose:

- A `SyncStatus` state machine: `offline | online | syncing | synced | sync_failed`
  (type already defined in `src/types/academic.ts`).
- Connectivity detection beyond `navigator.onLine` (reachability pings).
- A drain loop over the Dexie `syncQueue` table with retry/backoff.
- Last-write-wins conflict resolution keyed on `updated_at`.
- A React context/hook so any component can subscribe to sync status.
