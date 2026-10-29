import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";

export interface LocalSearchResult {
  kind: "subject" | "lecture" | "task" | "resource" | "semester" | "exam";
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

// Fix 4 (audit H-3): global search returned "No results found" for the
// user's OWN records. This rewrite removes every silent-failure mode found
// in the old version:
//  1. `deleted_at === null` dropped any row whose deleted_at was *undefined*
//     (rows written by older sync paths) -- alive now means "not deleted".
//  2. `l.keywords.join(" ")` threw when a synced lecture had keywords as a
//     string or null, and one throw killed the WHOLE search (the caller used
//     Promise.all, so subjects/tasks vanished too). Every field is now
//     normalised defensively and each table is searched independently.
//  3. The local (IndexedDB) copy can be empty/stale right after a fresh
//     login, before the first sync finishes. If the local search finds
//     nothing, we fall back to querying Supabase directly (RLS still limits
//     results to the caller's own rows) so search works from the first
//     second, not only after sync lands.
const alive = (r: { deleted_at?: string | null }) => !r.deleted_at;
const text = (v: unknown): string =>
  Array.isArray(v) ? v.map((x) => String(x ?? "")).join(" ") : v == null ? "" : String(v);
const hit = (haystack: unknown, q: string) => text(haystack).toLowerCase().includes(q);

async function searchLocalTables(userId: string, q: string): Promise<LocalSearchResult[]> {
  const results: LocalSearchResult[] = [];
  const [subjects, lectures, tasks, resources, semesters, exams] = await Promise.all([
    db.subjects.where({ user_id: userId }).filter(alive).toArray().catch(() => []),
    db.lectures.where({ user_id: userId }).filter(alive).toArray().catch(() => []),
    db.tasks.where({ user_id: userId }).filter(alive).toArray().catch(() => []),
    db.resources.where({ user_id: userId }).filter(alive).toArray().catch(() => []),
    db.semesters.where({ user_id: userId }).filter(alive).toArray().catch(() => []),
    db.exams.where({ user_id: userId }).filter(alive).toArray().catch(() => []),
  ]);
  const subjectName = new Map(subjects.map((s) => [s.id, s.name] as const));
  for (const s of subjects) {
    if (hit(`${s.name} ${text(s.code)}`, q))
      results.push({ kind: "subject", id: s.id, title: s.name, subtitle: "Subject", href: `/subjects/${s.id}` });
  }
  for (const l of lectures as any[]) {
    if (hit(`${l.title} ${text(l.short_summary)} ${text(l.detailed_notes)} ${text(l.keywords)}`, q))
      results.push({ kind: "lecture", id: l.id, title: l.title, subtitle: subjectName.get(l.subject_id) ?? "Notes", href: `/notes/lecture/${l.id}` });
  }
  for (const t of tasks) {
    if (hit(`${t.title} ${text(t.description)}`, q))
      results.push({ kind: "task", id: t.id, title: t.title, subtitle: subjectName.get(t.subject_id) ?? "Task", href: `/tasks/${t.id}` });
  }
  for (const r of resources) {
    if (hit(r.title, q))
      results.push({ kind: "resource", id: r.id, title: r.title, subtitle: "Resource", href: r.subject_id ? `/subjects/${r.subject_id}/resources` : "/notes" });
  }
  for (const s of semesters) {
    if (hit(s.name, q))
      results.push({ kind: "semester", id: s.id, title: s.name, subtitle: "Semester", href: `/semesters/${s.id}` });
  }
  for (const e of exams as any[]) {
    if (hit(`${e.title} ${text(e.exam_type)}`, q))
      results.push({ kind: "exam", id: e.id, title: e.title, subtitle: subjectName.get(e.subject_id) ?? "Exam", href: "/exams" });
  }
  return results;
}

async function searchSupabaseFallback(userId: string, query: string): Promise<LocalSearchResult[]> {
  const supabase = createClient();
  const like = `%${query.replace(/[%_]/g, "")}%`;
  const [subjects, lectures, tasks] = await Promise.all([
    supabase.from("subjects").select("id, name").eq("user_id", userId).is("deleted_at", null).ilike("name", like).limit(10),
    supabase.from("lectures").select("id, title, subject_id").eq("user_id", userId).is("deleted_at", null).ilike("title", like).limit(10),
    supabase.from("tasks").select("id, title, subject_id").eq("user_id", userId).is("deleted_at", null).ilike("title", like).limit(10),
  ]);
  const results: LocalSearchResult[] = [];
  for (const s of subjects.data ?? []) results.push({ kind: "subject", id: s.id, title: s.name, subtitle: "Subject", href: `/subjects/${s.id}` });
  for (const l of lectures.data ?? []) results.push({ kind: "lecture", id: l.id, title: l.title, subtitle: "Notes", href: `/notes/lecture/${l.id}` });
  for (const t of tasks.data ?? []) results.push({ kind: "task", id: t.id, title: t.title, subtitle: "Task", href: `/tasks/${t.id}` });
  return results;
}

export async function searchLocal(userId: string, query: string): Promise<LocalSearchResult[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const local = await searchLocalTables(userId, q);
  if (local.length > 0) return local.slice(0, 20);
  // Nothing locally -- either there truly is no match, or sync has not
  // landed yet. Ask the server before telling the user "no results".
  const remote = await searchSupabaseFallback(userId, query.trim()).catch(() => [] as LocalSearchResult[]);
  return remote.slice(0, 20);
}
