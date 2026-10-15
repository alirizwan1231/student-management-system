import { NotesEditorPage } from "@/components/notes/NotesEditorPage";

export default function EditNotesPage({ params }: { params: { lectureId: string } }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <NotesEditorPage mode="edit" lectureId={params.lectureId} />
    </main>
  );
}
