"use client";
import { useEffect, useState } from "react";
import { listSharedItems, listComments, postComment } from "@/lib/groups/api";
import type { GroupSharedItem, SharedSourceType } from "@/types/groups";
import { useUser } from "@/hooks/useUser";
import { SaveToPersonalModal } from "@/components/groups/SaveToPersonalModal";
import { Attribution } from "@/components/groups/Attribution";
import { openFileViewer } from "@/lib/files/viewerBus";
import { baseName } from "@/lib/files/types";
const TABS: { key: SharedSourceType; label: string }[] = [
  { key: "lecture", label: "Lectures / Notes" },
  { key: "task", label: "Tasks" },
  { key: "resource", label: "Resources" },
];
function ItemCard({ item, groupId }: { item: GroupSharedItem; groupId: string }) {
  const { user } = useUser();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [saveOpen, setSaveOpen] = useState(false);
  const snap = item.snapshot as any;
  const loadComments = () => listComments(item.id).then(setComments);
  const openFile = () =>
    openFileViewer({
      name: baseName(String(snap.storage_path || snap.file_name || snap.title || "file")),
      cacheKey: `group:${item.id}`,
      getUrl: async () => {
        const res = await fetch(`/api/groups/resources/${item.id}/download`);
        const body = await res.json();
        if (!body.url) throw new Error("No download link");
        return body.url as string;
      },
    });
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-800 dark:text-slate-100">{snap.title}</p>
          {snap.subject_name && <p className="text-xs text-slate-400 dark:text-slate-500">{snap.subject_name}</p>}
          <Attribution prefix="Shared by" name={item.profiles?.full_name} avatarUrl={item.profiles?.avatar_url} userId={item.shared_by} date={item.created_at} className="mt-1" />
          {snap.short_summary && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{snap.short_summary}</p>}
          {snap.deadline && <p className="mt-1 text-xs text-slate-400">Due {new Date(snap.deadline).toLocaleString()}</p>}
        </div>
        <div className="flex shrink-0 flex-col gap-1 text-right">
          {item.source_type === "resource" && snap.storage_path && (
            <button onClick={openFile} className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400">Open</button>
          )}
          <button onClick={() => setSaveOpen(true)} className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400">Save to my workspace</button>
          <button onClick={() => { setShowComments((v) => !v); if (!showComments) loadComments(); }} className="text-xs text-slate-400 hover:underline">
            Comments
          </button>
        </div>
      </div>
      {showComments && (
        <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
          <div className="space-y-1.5">
            {comments.map((c) => (
              <p key={c.id} className="text-xs text-slate-600 dark:text-slate-300">
                <span className="font-semibold">{c.profiles?.full_name || "Member"}:</span> {c.message}
              </p>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input value={text} onChange={(e) => setText(e.target.value)} className="flex-1 rounded-lg border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900" placeholder="Add a comment..." />
            <button
              onClick={async () => { if (!text.trim()) return; await postComment(groupId, item.id, text); setText(""); loadComments(); }}
              className="rounded-lg bg-brand-600 px-2 py-1 text-xs text-white"
            >
              Send
            </button>
          </div>
        </div>
      )}
      {saveOpen && <SaveToPersonalModal item={item} onClose={() => setSaveOpen(false)} />}
    </div>
  );
}
export function GroupLibrary({ groupId }: { groupId: string }) {
  const [tab, setTab] = useState<SharedSourceType>("lecture");
  const [items, setItems] = useState<GroupSharedItem[]>([]);
  useEffect(() => { listSharedItems(groupId, tab).then(setItems); }, [groupId, tab]);
  return (
    <div>
      <div className="mb-4 flex gap-1 border-b border-slate-200 dark:border-slate-800">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`rounded-t-lg px-4 py-2 text-sm font-medium ${tab === t.key ? "border-b-2 border-brand-600 text-brand-700 dark:text-brand-400" : "text-slate-500"}`}>
            {t.label}
          </button>
        ))}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">Nothing shared here yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => <ItemCard key={item.id} item={item} groupId={groupId} />)}
        </div>
      )}
    </div>
  );
}
