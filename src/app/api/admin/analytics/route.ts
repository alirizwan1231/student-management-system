import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { fetchAnalytics } from "@/lib/admin/data";

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const days = Number(new URL(request.url).searchParams.get("days") ?? 30);
  try {
    return NextResponse.json(await fetchAnalytics(days));
   } catch (error) {
    console.error("Admin analytics error:", error);
    const detail = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Could not load analytics", detail }, { status: 500 });
  }
}
