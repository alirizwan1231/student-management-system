"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useUser } from "@/hooks/useUser";
import { getClassPack } from "@/lib/classpack/api";
import { diffPack, readLinks, type PackLinks } from "@/lib/classpack/links";
import { getGroupmateProfiles } from "@/lib/groups/profiles";
import { Attribution } from "@/components/groups/Attribution";
import { PublishPackPanel } from "@/components/classpack/PublishPackPanel";
import { ImportPackPanel } from "@/components/classpack/ImportPackPanel";
import type { ClassPack } from "@/lib/classpack/types";

export function ClassPackTab({ groupId, myRole }: { groupId: string; myRole: string }) {
  const { user } = useUser();
  const staff = myRole === "owner" || myRole === "moderator";
  const [pack, setPack] = useState<ClassPack | null | undefined>(undefined); // undefined = loading
  const [links, setLinks] = useState<PackLinks | null>(null);
  const [publisher, setPublisher] = useState<{ name: string | null; avatar: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadLinks = useCallback(async () => setLinks(await readLinks(groupId)), [groupId]);

  const load = useCallback(async () => {
    try {
      setError(null);
      const p = await getClassPack(groupId);
      setPack(p);
      await loadLinks();
      if (p) {
        const people = await getGroupmateProfiles().catch(() => ({}) as Record<string, { name: string | null; avatar: string | null }>);
        setPublisher(people[p.published_by] ?? null);
      }
    } catch {
      setError("Could not load the class pack. Check your connection and try again.");
      setPack((prev) => (prev === undefined ? null : prev));
    }
  }, [groupId, loadLinks]);

  useEffect(() => {
    void load();
  }, [load]);

  const diff = useMemo(() => (pack ? diffPack(pack.payload, links) : { status: {}, newCount: 0, changedCount: 0 }), [pack, links]);

  if (!user || pack === undefined) return <div className="h-40 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/[0.04]" />;

  return (
    <div>
      {error && <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600 dark:border-rose-500/15 dark:bg-rose-500/[0.06] dark:text-rose-400">{error}</p>}

      {staff && <PublishPackPanel userId={user.id} groupId={groupId} currentVersion={pack?.version ?? 0} onPublished={() => void load()} />}

      {pack ? (
        <>
          <Attribution prefix="Published by" name={publisher?.name} avatarUrl={publisher?.avatar} userId={pack.published_by} date={pack.published_at} className="mb-3" />
          <ImportPackPanel key={`${pack.version}`} userId={user.id} pack={pack} links={links} diff={diff} onImported={() => void loadLinks()} />
        </>
      ) : myRole === "" ? (
        // Role not resolved yet: don't flash the member message at the
        // owner/CR who is about to get the publish panel.
        <div className="h-40 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/[0.04]" />
      ) : (
        !staff && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-white/[0.12] dark:bg-white/[0.02]">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Nothing published yet</p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Only the group Admin or a promoted CR can publish the class pack. When they do, you can import the subjects and timetable here.</p>
          </div>
        )
      )}
    </div>
  );
}
