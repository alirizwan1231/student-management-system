"use client";

import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { SyncProvider } from "@/lib/sync/context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SyncProvider>{children}</SyncProvider>
    </ThemeProvider>
  );
}
