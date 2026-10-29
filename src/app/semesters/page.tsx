import { SemesterList } from "@/components/semesters/SemesterList";

export default function SemestersPage() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 font-display text-2xl font-semibold text-brand-700 dark:text-brand-400">Semesters</h1>
      <SemesterList />
    </main>
  );
}
