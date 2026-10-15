import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { fetchUsersPage } from "@/lib/admin/data";
export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? undefined;
  const role = (searchParams.get("role") as "student" | "admin" | "all") ?? "all";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") ?? "20")));
  try {
    const result = await fetchUsersPage({ search, role, page, pageSize });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Admin users list error:", error);
    return NextResponse.json({ error: "Could not load users" }, { status: 500 });
  }
}
