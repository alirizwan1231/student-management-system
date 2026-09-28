"use client";

import Link from "next/link";
import { useUser } from "@/hooks/useUser";
import { useSemesters } from "@/hooks/useSemesters";
import {
  deleteSemester,
  setActiveSemester,
} from "@/lib/db/repo/semesters";
import { SemesterForm } from "./SemesterForm";

export function SemesterList() {
  const { user } = useUser();
  const semesters = useSemesters(user?.id);

  if (!user) return null;

  return (
    <div className="flex flex-col gap-6">
      <SemesterForm userId={user.id} />

      <div>
        {/* Section Header */}
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Your semesters
            </h3>

            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
              Manage your academic semesters.
            </p>
          </div>

          {semesters.length > 0 && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500 dark:bg-white/[0.05] dark:text-slate-400">
              {semesters.length}{" "}
              {semesters.length === 1
                ? "semester"
                : "semesters"}
            </span>
          )}
        </div>

        {semesters.length === 0 ? (
          <div className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 text-center dark:border-white/[0.08] dark:bg-white/[0.02]">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-white/[0.05] dark:text-slate-500">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5"
              >
                <path
                  d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
                <path
                  d="M4 5.5v14A2.5 2.5 0 0 1 6.5 17H20"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No semesters yet
            </h3>

            <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-400 dark:text-slate-500">
              Add your first semester above to start organizing
              your academic data.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {semesters.map((semester) => (
              <li
                key={semester.id}
                className={`group relative overflow-hidden rounded-2xl border bg-white p-4 shadow-sm transition-all hover:-translate-y-[1px] hover:shadow-md dark:bg-white/[0.025] ${
                  semester.is_active
                    ? "border-brand-200 dark:border-brand-500/20"
                    : "border-slate-200/80 dark:border-white/[0.07]"
                }`}
              >
                {/* Active Accent */}
                {semester.is_active && (
                  <div className="absolute bottom-4 left-0 top-4 w-1 rounded-r-full bg-brand-500" />
                )}

                <div
                  className={
                    semester.is_active ? "pl-3" : ""
                  }
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    {/* Semester Info */}
                    <Link
                      href={`/semesters/${semester.id}`}
                      className="min-w-0 flex-1"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-bold text-slate-900 transition-colors group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400">
                          {semester.name}
                        </h3>

                        {semester.is_active && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-bold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                            Active
                          </span>
                        )}
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                        <span>
                          Semester {semester.number}
                        </span>

                        <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />

                        <span>
                          {semester.start_date
                            ? new Date(
                                semester.start_date
                              ).toLocaleDateString(
                                undefined,
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                }
                              )
                            : "No start date"}
                        </span>

                        <span>→</span>

                        <span>
                          {semester.end_date
                            ? new Date(
                                semester.end_date
                              ).toLocaleDateString(
                                undefined,
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                }
                              )
                            : "No end date"}
                        </span>
                      </div>
                    </Link>

                    {/* Actions */}
                    <div className="flex items-center gap-2 sm:shrink-0">
                      {!semester.is_active && (
                        <button
                          type="button"
                          onClick={async () => {
                            await setActiveSemester(
                              user.id,
                              semester.id
                            );
                          }}
                          className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-[11px] font-bold text-brand-700 transition-all hover:border-brand-300 hover:bg-brand-100 active:scale-[0.98] dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/15"
                        >
                          Set active
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={async () => {
                          await deleteSemester(
                            semester.id
                          );
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-500 active:scale-[0.98] dark:border-white/[0.08] dark:text-slate-500 dark:hover:border-red-500/20 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                        aria-label="Delete semester"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          className="h-4 w-4"
                        >
                          <path
                            d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
