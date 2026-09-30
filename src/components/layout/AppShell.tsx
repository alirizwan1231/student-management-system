"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { Topbar } from "./Topbar";
import { WhatsAppButton } from "@/components/feedback/WhatsAppButton";

const CHROME_LESS_PATHS = ["/login", "/signup", "/auth/callback", "/"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const chromeLess = CHROME_LESS_PATHS.includes(pathname);

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
      <WhatsAppButton />
    </div>
  );
}