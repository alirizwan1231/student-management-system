"use client";

import { useRef, useState } from "react";
import { ExternalLink, FileText, Loader2, Paperclip, Trash2 } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { useLectureResources } from "@/hooks/useResources";
import { createResource, deleteResource } from "@/lib/db/repo/resources";
import {
  listPendingUploadsForResource,
  queueFileUpload,
  removePendingUpload,
} from "@/lib/db/repo/pendingUploads";
import { getResourceFileUrl } from "@/lib/supabase/storage";
import { inferResourceType } from "@/lib/utils/fileType";
import type { Resource } from "@/types/academic";

const TYPE_LABEL: Record<string, string> = {
  pdf: "PDF",
  ppt: "Slides",
  doc: "Document",
  image: "Image",
  link: "Link",
  other: "File",
};

// Attachments of one lecture's notes. Works offline: files are queued and
// uploaded by the sync engine, and a not-yet-uploaded file can still be
// opened from the local copy.
export function NotesAttachments({ lectureId, editable = false }: { lectureId: string; editable?: boolean }) {
  const { user } = useUser();
  const resources = useLectureResources(lectureId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addFiles = async (fileList: FileList | null) => {
    if (!user || !fileList || fileList.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      for (const file of Array.from(fileList)) {
        const resource = await createResource(user.id, {
          lecture_id: lectureId,
          title: file.name,
          resource_type: inferResourceType(file.name),
        });
        await queueFileUpload(user.id, resource.id, file);
      }
    } catch {
      setError("Couldn't attach the file. Please try again.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const openResource = async (resource: Resource) => {
    setError(null);
    const tab = window.open("about:blank", "_blank");
    try {
      let url: string | null = null;
      if (resource.url) {
        url = resource.url;
      } else if (resource.storage_path) {
        url = await getResourceFileUrl(resource.storage_path);
      } else {
        const pending = await listPendingUploadsForResource(resource.id);
        if (pending[0]) {
          url = URL.createObjectURL(pending[0].file_blob);
          setTimeout(() => URL.revokeObjectURL(url as string), 120000);
        }
      }
      if (!url) throw new Error("no source");
      if (tab) {
        tab.opener = null;
        tab.location.href = url;
      } else {
        window.location.href = url;
      }
    } catch {
      tab?.close();
      setError("Couldn't open this file. If you're offline, try again once you're back online.");
    }
  };

  const remove = async (resource: Resource) => {
    if (!window.confirm(`Remove "${resource.title}" from these notes?`)) return;
    const pending = await listPendingUploadsForResource(resource.id);
    for (const upload of pending) await removePendingUpload(upload.id);
    await deleteResource(resource.id);
  };

  return (
    <div className="space-y-3">
      {resources.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">No attachments yet.</p>
      ) : (
        <ul className="space-y-2">
          {resources.map((resource) => {
            const status = resource.storage_path ? "Uploaded" : resource.url ? "Link" : "Waiting to upload";
            return (
              <li
                key={resource.id}
                className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 px-3.5 py-3 dark:border-white/[0.07] dark:bg-white/[0.02]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600 shadow-sm dark:bg-brand-500/10 dark:text-brand-400">
                  <FileText size={16} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{resource.title}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                    {TYPE_LABEL[resource.resource_type] ?? "File"} • {status}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => openResource(resource)}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-brand-600 transition-colors hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10"
                >
                  <ExternalLink size={13} />
                  Open
                </button>

                {editable && (
                  <button
                    type="button"
                    onClick={() => remove(resource)}
                    aria-label={`Remove ${resource.title}`}
                    className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {error && <p className="text-xs font-medium text-status-overdue">{error}</p>}

      {editable && (
        <>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.ppt,.pptx,.doc,.docx,.png,.jpg,.jpeg"
            className="sr-only"
            onChange={(e) => addFiles(e.target.files)}
          />
          <button
            type="button"
            disabled={busy || !user}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3.5 py-2.5 text-xs font-semibold text-slate-600 transition-all hover:border-brand-300 hover:bg-brand-50/50 hover:text-brand-700 disabled:opacity-60 dark:border-white/[0.12] dark:text-slate-300 dark:hover:border-brand-500/30 dark:hover:bg-brand-500/[0.05] dark:hover:text-brand-300"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
            Attach files
          </button>
        </>
      )}
    </div>
  );
}
