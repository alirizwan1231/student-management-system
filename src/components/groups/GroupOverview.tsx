"use client";
import { useEffect, useState } from "react";
import { listAnnouncements, postAnnouncement } from "@/lib/groups/api";
export function GroupOverview({ groupId, myRole }: { groupId: string; myRole: string }) {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const canPost = myRole === "owner" || myRole === "moderator";
  const load = () => listAnnouncements(groupId).then(setAnnouncements);
  useEffect(() => { load(); }, [groupId]);
  return (
    <div>
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Announcements</h2>
      {canPost && (
        <div className="mb-4 flex gap-2">
          <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Post an announcement..." className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
          <button onClick={async () => { if (!message.trim()) return; await postAnnouncement(groupId, message); setMessage(""); load(); }} className="rounded-xl bg-brand-600 px-4 py-2 text-sm text-white">Post</button>
        </div>
      )}
      <div className="space-y-2">
        {announcements.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">No announcements yet.</p>
        ) : (
          announcements.map((a) => (
            <div key={a.id} className="rounded-xl border border-brand-200 bg-brand-50 p-3 dark:border-brand-500/20 dark:bg-brand-500/10">
              <p className="text-sm text-slate-700 dark:text-slate-200">{a.message}</p>
              <p className="mt-1 text-xs text-slate-400">Posted by {a.profiles?.full_name || a.profiles?.email} · {new Date(a.created_at).toLocaleDateString()}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
