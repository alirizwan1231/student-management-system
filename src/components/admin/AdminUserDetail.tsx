"use client";
import { useEffect, useState } from "react";
import { AdminRoleControl } from "@/components/admin/AdminRoleControl";
import { AdminRecordModal } from "@/components/admin/AdminRecordModal";
import { useToast } from "@/components/ui/Toast";
type Tab = "overview" | "semesters" | "subjects" | "lectures" | "tasks" | "resources";
const TABS: Tab[] = ["overview", "semesters", "subjects", "lectures", "tasks", "resources"];
const EDITABLE_TABS: Tab[] = ["semesters", "subjects", "lectures", "tasks"];
export function AdminUserDetail({ userId, currentAdminId }: { userId: string; currentAdminId: string }) {
  const { showToast } = useToast();
  const [detail, setDetail] = useState<any>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [rows, setRows] = useState<any[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [semesters, setSemesters] = useState<{ id: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [modal, setModal] = useState<{ table: Tab; record?: any } | null>(null);
  const loadProfile = () => {
    fetch(`/api/admin/users/${userId}`)
      .then((res) => res.json())
      .then(setDetail);
  };
  useEffect(() => {
    loadProfile();
    fetch(`/api/admin/users/${userId}/semesters`).then((r) => r.json()).then((d) => setSemesters(d.semesters ?? []));
    fetch(`/api/admin/users/${userId}/subjects`).then((r) => r.json()).then((d) => setSubjects(d.subjects ?? []));
  }, [userId]);
  const loadRows = () => {
    if (tab === "overview") return;
    setLoadingRows(true);
    fetch(`/api/admin/users/${userId}/${tab}`)
      .then((res) => res.json())
      .then((data) => setRows(data[tab] ?? []))
      .finally(() => setLoadingRows(false));
  };
  useEffect(() => {
    loadRows();
  }, [tab, userId]);
  const deleteRecord = async (table: string, id: string) => {
    if (!window.confirm("Are you sure you want to delete this? This action can be reviewed in the audit log.")) return;
    const res = await fetch(`/api/admin/records/${table}/${id}`, { method: "DELETE" });
    if (!res.ok) {
      showToast("Could not delete record.", "error");
      return;
    }
    setRows((r) => r.filter((row) => row.id !== id));
    showToast("Deleted successfully.");
  };
  const deleteResource = async (id: string) => {
    if (!window.confirm("Delete this file? This also removes it from storage.")) return;
    const res = await fetch(`/api/admin/resources/${id}`, { method: "DELETE" });
    if (!res.ok) {
      showToast("Could not delete file.", "error");
      return;
    }
    setRows((r) => r.filter((row) => row.id !== id));
    showToast("File deleted.");
  };
  const openResource = async (id: string) => {
    const res = await fetch(`/api/admin/resources/${id}`);
    const body = await res.json();
    if (body.url) window.open(body.url, "_blank");
    else showToast(body.error || "Could not open file.", "error");
  };
  const handleSaved = (savedRecord: any) => {
    loadRows();
    // Keep the semester/subject picker lists fresh after a create.
    if (modal?.table === "semesters") fetch(`/api/admin/users/${userId}/semesters`).then((r) => r.json()).then((d) => setSemesters(d.semesters ?? []));
    if (modal?.table === "subjects") fetch(`/api/admin/users/${userId}/subjects`).then((r) => r.json()).then((d) => setSubjects(d.subjects ?? []));
  };
  if (!detail) return <div className="h-40 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/[0.04]" />;
  const { profile, lastSignInAt, counts } = detail;
  return (
    <div>
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">{profile.full_name || "User"}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{profile.email}</p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Joined {new Date(profile.created_at).toLocaleDateString()}
            {lastSignInAt && ` • Last sign-in ${new Date(lastSignInAt).toLocaleString(undefined, { hour12: true })}`}
          </p>
        </div>
        <AdminRoleControl
          userId={userId}
          role={profile.role}
          disabledAt={profile.disabled_at}
          isSelf={userId === currentAdminId}
          onChanged={loadProfile}
        />
      </header>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          ["Semesters", counts.semester_count],
          ["Subjects", counts.subject_count],
          ["Lectures", counts.lecture_count],
          ["Tasks", counts.task_count],
          ["Resources", counts.resource_count],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-xl border border-slate-200/80 bg-white p-3 text-center dark:border-white/[0.07] dark:bg-white/[0.025]">
            <p className="text-xl font-bold text-slate-900 dark:text-white">{value as number}</p>
            <p className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">{label}</p>
          </div>
        ))}
      </div>
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-200 dark:border-white/[0.08]">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`shrink-0 rounded-t-lg px-4 py-2 text-sm font-medium capitalize transition-colors ${
                tab === t ? "border-b-2 border-brand-600 text-brand-700 dark:text-brand-400" : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {EDITABLE_TABS.includes(tab) && (
          <button
            onClick={() => setModal({ table: tab })}
            className="mb-2 shrink-0 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
          >
            + Add
          </button>
        )}
      </div>
      {tab === "overview" ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Select a tab above to browse this user's academic data.</p>
      ) : loadingRows ? (
        <div className="h-32 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/[0.04]" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">No {tab} yet.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white p-3.5 dark:border-white/[0.07] dark:bg-white/[0.025]">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {row.title || row.name || "Untitled"}
                </p>
                {row.short_summary && <p className="truncate text-xs text-slate-400 dark:text-slate-500">{row.short_summary}</p>}
                {row.status && <p className="text-xs text-slate-400 dark:text-slate-500">Status: {row.status}</p>}
                {row.deadline && <p className="text-xs text-slate-400 dark:text-slate-500">Due {new Date(row.deadline).toLocaleString(undefined, { hour12: true })}</p>}
              </div>
              <div className="flex shrink-0 gap-2">
                {tab === "resources" ? (
                  <>
                    <button onClick={() => openResource(row.id)} className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400">
                      Open
                    </button>
                    <button onClick={() => deleteResource(row.id)} className="text-xs font-semibold text-status-overdue hover:underline">
                      Delete
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setModal({ table: tab, record: row })} className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400">
                      Edit
                    </button>
                    <button onClick={() => deleteRecord(tab, row.id)} className="text-xs font-semibold text-status-overdue hover:underline">
                      Delete
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {modal && (
        <AdminRecordModal
          table={modal.table as "semesters" | "subjects" | "lectures" | "tasks"}
          userId={userId}
          record={modal.record}
          semesters={semesters}
          subjects={subjects}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
