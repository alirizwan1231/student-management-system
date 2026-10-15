import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { fetchDashboardStats } from "@/lib/admin/data";
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const stats = await fetchDashboardStats();
    return NextResponse.json(stats);
   } catch (error) {
    console.error("Admin stats error:", error);
    const detail = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Could not load stats", detail }, { status: 500 });
  }
}
