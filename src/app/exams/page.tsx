import { ExamsPage } from "@/components/exams/ExamsPage";

export const metadata = { title: "Exams" };

export default function ExamsRoute() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <ExamsPage />
    </main>
  );
}
