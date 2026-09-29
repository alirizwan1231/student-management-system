import { redirect } from "next/navigation";

export default function LegacyLecturePage({ params }: { params: { lectureId: string } }) {
  redirect(`/notes/lecture/${params.lectureId}`);
}
