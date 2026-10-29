"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { previewGroupByCode, joinGroupByCode } from "@/lib/groups/api";
export function JoinGroupModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<{ name: string; description: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const handlePreview = async () => {
    setError(null);
    setBusy(true);
    const result = await previewGroupByCode(code.trim());
    setBusy(false);
    if (!result) { setError("Invalid invite code."); return; }
    setPreview(result);
  };
  const handleJoin = async () => {
    setBusy(true);
    setError(null);
    try {
      const group = await joinGroupByCode(code.trim());
      setOpen(false);
      router.push(`/groups/${group.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not join group.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-300">
        Join with code
      </button>
      {open && (
        <Modal title="Join a group" onClose={() => setOpen(false)}>
          {!preview ? (
            <div className="flex flex-col gap-3">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="INVITE-CODE"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm uppercase dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
              {error && <p className="text-xs text-status-overdue">{error}</p>}
              <button disabled={busy || !code.trim()} onClick={handlePreview} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
                Find group
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <p className="font-semibold text-slate-800 dark:text-slate-100">{preview.name}</p>
                {preview.description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{preview.description}</p>}
              </div>
              {error && <p className="text-xs text-status-overdue">{error}</p>}
              <button disabled={busy} onClick={handleJoin} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
                {busy ? "Joining..." : "Join group"}
              </button>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
