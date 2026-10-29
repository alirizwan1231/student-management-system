import { joinGroupByCode } from "@/lib/groups/api";
import type { Group } from "@/types/groups";

const KEY = "um-pending-join";

// An invite link (/join/CODE) saves the code here, so it survives sign-up and login.
export function setPendingJoin(code: string) {
  try {
    localStorage.setItem(KEY, code.trim());
  } catch {
    /* storage blocked */
  }
}
export function getPendingJoin(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}
export function clearPendingJoin() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export const classPackUrl = (groupId: string) => `/groups/${groupId}?tab=Class%20Pack`;

export async function joinWithCode(code: string): Promise<Group> {
  const group = await joinGroupByCode(code.trim());
  clearPendingJoin();
  return group;
}

export function joinErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : (err as { message?: string })?.message ?? "";
  if (/already/i.test(raw)) return "You are already in this class.";
  return "That class code did not work. Ask your class representative for a new link.";
}
