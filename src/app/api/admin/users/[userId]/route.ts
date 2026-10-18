import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { fetchUserProfile } from "@/lib/admin/data";
export async function GET(_request: Request, { params }: { params: { userId: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const result = await fetchUserProfile(params.userId);
  if (!result) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json(result);
}
