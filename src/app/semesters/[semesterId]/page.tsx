import { SubjectList } from "@/components/subjects/SubjectList";

export default function SemesterDetailPage({ params }: { params: { semesterId: string } }) {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 font-display text-2xl font-semibold text-brand-700 dark:text-brand-400">Subjects</h1>
      <SubjectList semesterId={params.semesterId} />
    </main>
  );
}
