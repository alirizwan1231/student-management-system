import { LectureList } from "@/components/lectures/LectureList";

export default function SubjectDetailPage({ params }: { params: { subjectId: string } }) {
  return <LectureList subjectId={params.subjectId} />;
}
