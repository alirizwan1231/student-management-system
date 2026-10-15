import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { globalSearch } from "@/lib/admin/data";
export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const q = new URL(request.url).searchParams.get("q") ?? "";
  if (q.trim().length < 2) return NextResponse.json({ results: [] });
  try {
    const results = await globalSearch(q);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Admin search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
