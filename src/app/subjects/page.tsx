"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Clock, Search, User } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { useAllSubjects } from "@/hooks/useSubjects";
import { useSemesters } from "@/hooks/useSemesters";
import { deleteSubject } from "@/lib/db/repo/subjects";
import { AddSubjectModal } from "@/components/subjects/AddSubjectModal";
import { EditSubjectModal } from "@/components/subjects/EditSubjectModal";
import { Select } from "@/components/ui/Select";

// All subjects across every semester, grouped by semester, with search.
export default function SubjectsPage() {
  const { user } = useUser();
  const subjects = useAllSubjects(user?.id);
  const semesters = useSemesters(user?.id);
  const [query, setQuery] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("all");

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const orderedSemesters = [...(semesters ?? [])].sort((a, b) => Number(b.is_active) - Number(a.is_active) || b.number - a.number);
    const matches = (subjects ?? []).filter(
      (s) =>
        (semesterFilter === "all" || s.semester_id === semesterFilter) &&
        (!q || `${s.name} ${s.code ?? ""} ${s.lecturer_name ?? ""}`.toLowerCase().includes(q))
    );
    const result = orderedSemesters
      .map((sem) => ({ id: sem.id, title: sem.name + (sem.is_active ? " (current)" : ""), items: matches.filter((s) => s.semester_id === sem.id).sort((a, b) => a.name.localeCompare(b.name)) }))
      .filter((g) => g.items.length > 0);
    const known = new Set(orderedSemesters.map((s) => s.id));
    const orphans = matches.filter((s) => !known.has(s.semester_id));
    if (orphans.length > 0) result.push({ id: "other", title: "Other", items: orphans });
    return result;
  }, [subjects, semesters, query, semesterFilter]);

  if (!user) return <main className="p-6 text-sm text-slate-400 dark:text-slate-500">Loading...</main>;

  const total = (subjects ?? []).length;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Subjects</h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{total} {total === 1 ? "subject" : "subjects"} across all semesters.</p>
        </div>
        <AddSubjectModal userId={user.id} />
      </header>

      <div className="mb-6 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, code or instructor..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-100"
          />
        </div>
        <Select
          value={semesterFilter}
          onChange={(e) => setSemesterFilter(e.target.value)}
          aria-label="Filter by semester"
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 dark:border-white/[0.08] dark:bg-slate-900 dark:text-slate-200"
        >
          <option value="all">All semesters</option>
          {(semesters ?? []).map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </Select>
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-white/[0.12] dark:bg-white/[0.02]">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
            <BookOpen size={22} />
          </div>
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">{total === 0 ? "No subjects yet" : "No subjects match"}</h2>
          <p className="mt-1.5 max-w-sm text-sm text-slate-500 dark:text-slate-400">
            {total === 0 ? "Create a semester first, then add your subjects with the button above." : "Try a different search or semester."}
          </p>
          {total === 0 && (
            <Link href="/semesters" className="mt-4 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 dark:bg-brand-500">
              Go to semesters
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.id}>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {group.title} <span className="font-medium">({group.items.length})</span>
              </h2>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {group.items.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025]"
                    style={{ borderLeft: `4px solid ${s.color || "#3366ff"}` }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <Link href={`/subjects/${s.id}`} className="min-w-0 text-sm font-bold text-slate-900 hover:underline dark:text-white">
                        <span className="block truncate">{s.name}</span>
                        {s.code && <span className="text-xs font-medium text-slate-400 dark:text-slate-500">{s.code}</span>}
                      </Link>
                      <div className="flex shrink-0 items-center gap-3">
                        <EditSubjectModal userId={user.id} subject={s} />
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Delete "${s.name}"? Its notes, tasks and files will be removed too.`)) void deleteSubject(s.id);
                          }}
                          className="text-xs font-medium text-status-overdue hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      {s.lecturer_name && (
                        <span className="inline-flex items-center gap-1.5"><User size={12} />{s.lecturer_name}</span>
                      )}
                      {s.credit_hours ? (
                        <span className="inline-flex items-center gap-1.5"><Clock size={12} />{s.credit_hours} credit hrs</span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}