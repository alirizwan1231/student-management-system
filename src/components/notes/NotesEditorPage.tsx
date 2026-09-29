"use client";

import Link from "next/link";
import { useUser } from "@/hooks/useUser";
import { useSubject } from "@/hooks/useSubjects";
import { useLectureOrNull } from "@/hooks/useNotes";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { NotesForm } from "@/components/notes/NotesForm";
import { lectureLabel } from "@/lib/utils/notes";

function PageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200 dark:bg-white/[0.06]" />
      <div className="h-40 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/[0.04]" />
      <div className="h-72 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/[0.04]" />
    </div>
  );
}

// Shared shell for /notes/new and /notes/lecture/[id]/edit.
export function NotesEditorPage({
  mode,
  lectureId,
  initialSubjectId,
}: {
  mode: "create" | "edit";
  lectureId?: string;
  initialSubjectId?: string;
}) {
  const { user } = useUser();
  const lecture = useLectureOrNull(mode === "edit" ? lectureId : undefined);
  const subject = useSubject(lecture?.subject_id);

  if (!user) return <PageSkeleton />;

  if (mode === "edit") {
    if (lecture === undefined) return <PageSkeleton />;
    if (lecture === null) {
      return (
        <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-white/[0.12]">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">These notes could not be found.</p>
          <Link href="/notes" className="mt-3 inline-flex text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400">
            Back to Notes
          </Link>
        </div>
      );
    }
  }

  const crumbs =
    mode === "edit" && lecture
      ? [
          { label: "Notes", href: "/notes" },
          { label: subject?.name ?? "Subject", href: `/notes/subject/${lecture.subject_id}` },
          { label: lectureLabel(lecture.lecture_number), href: `/notes/lecture/${lecture.id}` },
          { label: "Edit" },
        ]
      : [{ label: "Notes", href: "/notes" }, { label: "Add notes" }];

  return (
    <div>
      <Breadcrumbs items={crumbs} />

      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          {mode === "edit" ? "Edit notes" : "Add notes"}
        </h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          {mode === "edit"
            ? "Update what you wrote for this lecture."
            : "Save what you learned in class — pick the subject and lecture number, then write it all down."}
        </p>
      </header>

      <NotesForm
        key={lecture?.id ?? "new"}
        userId={user.id}
        initialSubjectId={initialSubjectId}
        lecture={mode === "edit" ? (lecture ?? undefined) : undefined}
      />
    </div>
  );
}
