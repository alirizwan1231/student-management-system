import { InstructorDetail } from "@/components/instructors/InstructorDetail";

export default function InstructorDetailPage({ params }: { params: { instructorId: string } }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <InstructorDetail lecturerId={params.instructorId} />
    </main>
  );
}
