import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { fetchUserResources } from "@/lib/admin/data";
export async function GET(request: Request, { params }: { params: { userId: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const data = await fetchUserResources(params.userId, {
    subjectId: searchParams.get("subjectId") ?? undefined,
    lectureId: searchParams.get("lectureId") ?? undefined,
    taskId: searchParams.get("taskId") ?? undefined,
  });
  return NextResponse.json({ resources: data });
}
