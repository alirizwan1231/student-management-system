import { GroupDetail } from "@/components/groups/GroupDetail";
export default function GroupDetailPage({ params }: { params: { groupId: string } }) {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <GroupDetail groupId={params.groupId} />
    </main>
  );
}
