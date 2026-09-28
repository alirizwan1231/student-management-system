"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getDashboardData } from "@/lib/db/repo/dashboard";

export function useDashboard(userId: string | undefined) {
  return useLiveQuery(
    () => (userId ? getDashboardData(userId) : undefined),
    [userId]
  );
}
