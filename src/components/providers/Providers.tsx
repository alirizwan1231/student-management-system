"use client";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { SyncProvider } from "@/lib/sync/context";
import { ToastProvider } from "@/components/ui/Toast";
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <SyncProvider>{children}</SyncProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
