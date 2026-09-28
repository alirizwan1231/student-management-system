"use client";

import Link from "next/link";
import { useSubjects } from "@/hooks/useSubjects";
import { deleteSubject } from "@/lib/db/repo/subjects";
import { useUser } from "@/hooks/useUser";
import { SubjectForm } from "./SubjectForm";

export function SubjectList({ semesterId }: { semesterId: string }) {
  const { user } = useUser();
  const subjects = useSubjects(semesterId);

  if (!user) return null;

  return (
    <div className="flex flex-col gap-6">
      <SubjectForm userId={user.id} semesterId={semesterId} />
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {subjects.length === 0 && (
          <p className="text-sm text-slate-400 dark:text-slate-500">No subjects yet for this semester.</p>
        )}
        {subjects.map((s) => (
          <li
            key={s.id}
            className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            style={{ borderLeft: `4px solid ${s.color || "#3366ff"}` }}
          >
            <div className="flex items-start justify-between">
              <Link href={`/subjects/${s.id}`} className="font-medium text-slate-800 hover:underline dark:text-slate-100">
                {s.name} {s.code && <span className="text-slate-400 dark:text-slate-500">({s.code})</span>}
              </Link>
              <button
                onClick={() => deleteSubject(s.id)}
                className="text-xs font-medium text-status-overdue hover:underline"
              >
                Delete
              </button>
            </div>
            {s.lecturer_name && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{s.lecturer_name}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
