"use client";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { useUser } from "@/hooks/useUser";
import { useAllSubjects } from "@/hooks/useSubjects";
import { createLecture } from "@/lib/db/repo/lectures";
import { createTask } from "@/lib/db/repo/tasks";
import { createResource } from "@/lib/db/repo/resources";
import { queueFileUpload } from "@/lib/db/repo/pendingUploads";
import type { GroupSharedItem } from "@/types/groups";
const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";
export function SaveToPersonalModal({ item, onClose }: { item: GroupSharedItem; onClose: () => void }) {
  const { user } = useUser();
  const subjects = useAllSubjects(user?.id);
  const [subjectId, setSubjectId] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
const handleSave = async () => {
    if (!user || !subjectId) return;
    setSaving(true);
    const snap = item.snapshot as any;
    if (item.source_type === "lecture") {
      await createLecture(user.id, {
        subject_id: subjectId,
        title: snap.title,
        lecture_number: snap.lecture_number,
        lecture_date: null,
        short_summary: snap.short_summary,
        detailed_notes: snap.detailed_notes,
        keywords: snap.keywords ?? [],
      });
    } else if (item.source_type === "task") {
      await createTask(user.id, {
        subject_id: subjectId,
        title: snap.title,
        task_type: snap.task_type,
        deadline: snap.deadline,
        priority: snap.priority,
        marks: snap.marks,
        description: snap.description,
      });
    } else if (item.source_type === "resource") {
      if (snap.storage_path) {
        // File-based: copy the actual object into our own R2 prefix first.
        const res = await fetch(`/api/groups/resources/${item.id}/copy`, { method: "POST" });
        const body = await res.json();
        if (res.ok) {
          const resource = await createResource(user.id, { subject_id: subjectId, title: snap.title, resource_type: snap.resource_type });
          // attachStoragePath directly since the file is already uploaded (no queue needed)
          const { attachStoragePath } = await import("@/lib/db/repo/resources");
          await attachStoragePath(resource.id, body.storagePath);
        }
      } else {
        await createResource(user.id, { subject_id: subjectId, title: snap.title, resource_type: snap.resource_type, url: snap.url });
      }
    }
    setSaving(false);
    setDone(true);
    setTimeout(onClose, 1000);
  };
  return (
    <Modal title="Save to my workspace" onClose={onClose}>
      {done ? (
        <p className="text-sm font-semibold text-status-completed">Saved to your workspace.</p>
      ) : (
        <div className="flex flex-col gap-3">
          <select className={inputClass} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            <option value="">Select a subject to save into</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button disabled={!subjectId || saving} onClick={handleSave} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      )}
    </Modal>
  );
}
