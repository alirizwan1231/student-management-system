"use client";
import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { listMyGroups, shareItemToGroups } from "@/lib/groups/api";
import type { SharedSourceType } from "@/types/groups";
export function ShareToGroupModal({
  sourceType, sourceId, snapshot, onClose,
}: { sourceType: SharedSourceType; sourceId: string; snapshot: unknown; onClose: () => void }) {
  const [groups, setGroups] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  useEffect(() => { listMyGroups().then(setGroups); }, []);
  const toggle = (id: string) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const handleShare = async () => {
    await shareItemToGroups({ groupIds: selected, sourceType, sourceId, snapshot });
    setDone(true);
    setTimeout(onClose, 1200);
  };
  return (
    <Modal title="Share to Group" onClose={onClose}>
      {done ? (
        <p className="text-sm font-semibold text-status-completed">Shared with {selected.length} group{selected.length === 1 ? "" : "s"}.</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-slate-400">You're not in any groups yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map((g) => (
            <label key={g.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={selected.includes(g.id)} onChange={() => toggle(g.id)} />
              {g.name}
            </label>
          ))}
          <button disabled={selected.length === 0} onClick={handleShare} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
            Share
          </button>
        </div>
      )}
    </Modal>
  );
}
