"use client";

import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { Topbar } from "./Topbar";
import { UnsyncedBanner } from "@/components/sync/UnsyncedBanner";
import { FileViewerHost } from "@/components/files/FileViewer";

// Non-critical background helpers: they only matter seconds after load
// (install prompt, reminder checks, a pending group-join link), so they
// load as separate chunks and stay out of the first bundle every page pays.
const InstallPrompt = dynamic(() => import("@/components/pwa/InstallPrompt").then((m) => m.InstallPrompt), { ssr: false });
const ReminderManager = dynamic(() => import("@/components/pwa/ReminderManager").then((m) => m.ReminderManager), { ssr: false });
const PendingJoinHandler = dynamic(() => import("@/components/groups/PendingJoinHandler").then((m) => m.PendingJoinHandler), { ssr: false });

const CHROME_LESS_PATHS = ["/login", "/signup", "/forgot-password", "/reset-password", "/offline", "/auth/callback", "/auth/confirm", "/privacy", "/terms", "/contact", "/"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const chromeLess = (CHROME_LESS_PATHS.includes(pathname) || pathname.startsWith("/join/"));

  if (chromeLess) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col pb-16 md:pb-0">
        <Topbar />
        <div className="flex-1">{children}</div>
      </div>
      <MobileNav />
      <InstallPrompt />
      <ReminderManager />
      <UnsyncedBanner />
      <FileViewerHost />
      <PendingJoinHandler />
    </div>
  );
}
