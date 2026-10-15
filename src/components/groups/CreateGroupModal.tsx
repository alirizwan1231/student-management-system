"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { useAllSubjects } from "@/hooks/useSubjects";
import { useSemesters } from "@/hooks/useSemesters";
import { useUser } from "@/hooks/useUser";
import { createGroup } from "@/lib/groups/api";
const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";
const labelClass = "mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400";
export function CreateGroupModal() {
  const router = useRouter();
  const { user } = useUser();
  const subjects = useAllSubjects(user?.id);
  const semesters = useSemesters(user?.id);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [semesterId, setSemesterId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handleCreate = async () => {
    if (!name.trim()) { setError("Name is required."); return; }
    setSaving(true);
    setError(null);
    try {
      const group = await createGroup({ name, description, subject_id: subjectId || null, semester_id: semesterId || null });
      setOpen(false);
      router.push(`/groups/${group.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create group.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
        + Create Group
      </button>
      {open && (
        <Modal title="Create a study group" onClose={() => setOpen(false)}>
          <div className="flex flex-col gap-3">
            <div>
              <label className={labelClass}>Group name</label>
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="DBMS Study Group" />
            </div>
            <div>
              <label className={labelClass}>Description</label>
              <textarea rows={2} className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Subject (optional)</label>
              <select className={inputClass} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                <option value="">None</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Semester (optional)</label>
              <select className={inputClass} value={semesterId} onChange={(e) => setSemesterId(e.target.value)}>
                <option value="">None</option>
                {semesters.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            {error && <p className="text-xs text-status-overdue">{error}</p>}
            <button disabled={saving} onClick={handleCreate} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
              {saving ? "Creating..." : "Create group"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
