"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { useToast } from "@/components/ui/Toast";
import { classPackUrl, clearPendingJoin, getPendingJoin, joinErrorMessage, joinWithCode } from "@/lib/groups/pendingJoin";

export function PendingJoinHandler() {
  const { user } = useUser();
  const router = useRouter();
  const { showToast } = useToast();
  const ran = useRef(false);

  useEffect(() => {
    if (!user || ran.current) return;
    const code = getPendingJoin();
    if (!code || !navigator.onLine) return;
    ran.current = true;
    joinWithCode(code)
      .then((group) => {
        showToast(`You joined ${group.name}. Import your class pack now.`);
        router.push(classPackUrl(group.id));
      })
      .catch((err) => {
        clearPendingJoin();
        showToast(joinErrorMessage(err), "error");
      });
  }, [user, router, showToast]);

  return null;
}
