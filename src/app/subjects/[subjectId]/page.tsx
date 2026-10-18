import { SubjectNotesList } from "@/components/notes/SubjectNotesList";

export default function SubjectNotesTabPage({ params }: { params: { subjectId: string } }) {
  return <SubjectNotesList subjectId={params.subjectId} embedded />;
}
