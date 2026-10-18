"use client";

import { useUser } from "@/hooks/useUser";
import { useSubjectResources } from "@/hooks/useResources";
import { ResourceForm } from "@/components/resources/ResourceForm";
import { ResourceList } from "@/components/resources/ResourceList";

export default function SubjectResourcesPage({ params }: { params: { subjectId: string } }) {
  const { user } = useUser();
  const resources = useSubjectResources(params.subjectId);

  if (!user) return null;

  return (
    <div className="flex flex-col gap-6">
      <ResourceForm userId={user.id} subjectId={params.subjectId} />
      <ResourceList resources={resources} />
    </div>
  );
}
