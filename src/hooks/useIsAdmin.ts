"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// True when the signed-in user's profile has role = 'admin' (and is not
// disabled). Only controls whether the "Admin panel" link is shown; the
// real protection is server-side in src/lib/admin/guard.ts.
export function useIsAdmin(userId: string | undefined) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!userId) {
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    createClient()
      .from("profiles")
      .select("role, disabled_at")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setIsAdmin(data?.role === "admin" && !data?.disabled_at);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return isAdmin;
}
