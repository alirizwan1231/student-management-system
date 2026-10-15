import { SubjectNotesList } from "@/components/notes/SubjectNotesList";

export default function SubjectNotesPage({ params }: { params: { subjectId: string } }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <SubjectNotesList subjectId={params.subjectId} />
    </main>
  );
}
