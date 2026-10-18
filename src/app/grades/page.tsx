import { GradesPage } from "@/components/grades/GradesPage";

export const metadata = { title: "Grades" };

export default function GradesRoute() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <GradesPage />
    </main>
  );
}
