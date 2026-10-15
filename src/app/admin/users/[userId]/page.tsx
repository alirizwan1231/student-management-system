import { requireAdmin } from "@/lib/admin/guard";
import { AdminUserDetail } from "@/components/admin/AdminUserDetail";
export default async function AdminUserDetailPage({ params }: { params: { userId: string } }) {
  const admin = await requireAdmin();
  return <AdminUserDetail userId={params.userId} currentAdminId={admin!.userId} />;
}
