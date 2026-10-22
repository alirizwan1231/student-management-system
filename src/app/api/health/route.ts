import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Tiny same-origin endpoint the app pings to know whether the internet really works
// (the service worker never caches /api/, so an offline phone gets a real failure).
export function GET() {
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
