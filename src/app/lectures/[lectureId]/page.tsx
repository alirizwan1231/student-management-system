import { LectureDetail } from "@/components/lectures/LectureDetail";

export default function LecturePage({ params }: { params: { lectureId: string } }) {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <LectureDetail lectureId={params.lectureId} />
    </main>
  );
}
