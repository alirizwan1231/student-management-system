import { SubjectTabs } from "@/components/subjects/SubjectTabs";

export default function SubjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { subjectId: string };
}) {
  return (
    <div>
      <SubjectTabs subjectId={params.subjectId} />
      <div className="mx-auto max-w-3xl px-6 pb-6 pt-4">{children}</div>
    </div>
  );
}
