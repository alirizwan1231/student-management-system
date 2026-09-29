import { NoteDetail } from "@/components/notes/NoteDetail";

export default function NoteDetailPage({ params }: { params: { lectureId: string } }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <NoteDetail lectureId={params.lectureId} />
    </main>
  );
}
