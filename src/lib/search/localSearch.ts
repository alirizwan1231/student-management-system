import { db } from "@/lib/db";
export interface LocalSearchResult {
  kind: "subject" | "lecture" | "task" | "resource";
  id: string;
  title: string;
  subtitle: string;
  href: string;
}
export async function searchLocal(userId: string, query: string): Promise<LocalSearchResult[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const [subjects, lectures, tasks, resources] = await Promise.all([
    db.subjects.where({ user_id: userId }).filter((s) => s.deleted_at === null).toArray(),
    db.lectures.where({ user_id: userId }).filter((l) => l.deleted_at === null).toArray(),
    db.tasks.where({ user_id: userId }).filter((t) => t.deleted_at === null).toArray(),
    db.resources.where({ user_id: userId }).filter((r) => r.deleted_at === null).toArray(),
  ]);
  const results: LocalSearchResult[] = [];
  for (const s of subjects) {
    if (s.name.toLowerCase().includes(q)) {
      results.push({ kind: "subject", id: s.id, title: s.name, subtitle: "Subject", href: `/subjects/${s.id}` });
    }
  }
  for (const l of lectures) {
    const haystack = `${l.title} ${l.short_summary ?? ""} ${l.detailed_notes ?? ""} ${l.keywords.join(" ")}`.toLowerCase();
    if (haystack.includes(q)) {
      const subject = subjects.find((s) => s.id === l.subject_id);
      results.push({ kind: "lecture", id: l.id, title: l.title, subtitle: subject?.name ?? "Notes", href: `/notes/lecture/${l.id}` });
    }
  }
  for (const t of tasks) {
    if (t.title.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q)) {
      const subject = subjects.find((s) => s.id === t.subject_id);
      results.push({ kind: "task", id: t.id, title: t.title, subtitle: subject?.name ?? "Task", href: `/tasks/${t.id}` });
    }
  }
  for (const r of resources) {
    if (r.title.toLowerCase().includes(q)) {
      results.push({ kind: "resource", id: r.id, title: r.title, subtitle: "Resource", href: r.subject_id ? `/subjects/${r.subject_id}/resources` : "/notes" });
    }
  }
  return results.slice(0, 20);
}
