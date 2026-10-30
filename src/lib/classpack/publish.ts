import { publishClassPack } from "@/lib/classpack/api";
import type { ClassPackPayload, PackFile } from "@/lib/classpack/types";

// Gives the pack its own copy of every shared file, swaps the file paths, then publishes.
export async function publishWithFiles(groupId: string, title: string, payload: ClassPackPayload): Promise<{ version: number; skippedFiles: number }> {
  const sources = new Set<string>();
  // Files ride in two places: under lecture notes and under tasks.
  for (const s of payload.subjects) {
    for (const n of s.notes ?? []) for (const f of n.files) if (f.pack_path?.startsWith("users/")) sources.add(f.pack_path);
    for (const t of s.tasks ?? []) for (const f of t.files ?? []) if (f.pack_path?.startsWith("users/")) sources.add(f.pack_path);
  }

  const mapping = new Map<string, string>();
  const list = [...sources];
  for (let i = 0; i < list.length; i += 40) {
    const chunk = list.slice(i, i + 40).map((sourcePath) => ({ sourcePath, name: sourcePath.split("/").pop() }));
    const res = await fetch("/api/classpack/files", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ groupId, files: chunk }) });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error || "Could not share the files");
    }
    const data = (await res.json()) as { files: { sourcePath: string; packPath?: string }[] };
    for (const f of data.files) if (f.packPath) mapping.set(f.sourcePath, f.packPath);
  }

  let skippedFiles = 0;
  const remapFiles = (files: PackFile[]): PackFile[] =>
    files.flatMap((f) => {
      if (f.url) return [f];
      const mapped = f.pack_path ? mapping.get(f.pack_path) : undefined;
      if (!mapped) {
        skippedFiles += 1;
        return [];
      }
      return [{ ...f, pack_path: mapped }];
    });

  const next: ClassPackPayload = {
    ...payload,
    subjects: payload.subjects.map((s) => ({
      ...s,
      notes: s.notes?.map((n) => ({ ...n, files: remapFiles(n.files) })),
      tasks: s.tasks?.map((t) => ({ ...t, files: remapFiles(t.files ?? []) })),
    })),
  };

  const version = await publishClassPack(groupId, title, next);
  return { version, skippedFiles };
}
