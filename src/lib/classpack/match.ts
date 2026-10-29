const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

// Same name in the same semester = the same subject. A different code (e.g. Th vs Lab) = a different subject.
export function exactSubjectMatch<T extends { name: string; code: string | null }>(item: { name: string; code: string | null }, mine: T[]): T | undefined {
  return mine.find((s) => norm(s.name) === norm(item.name) && !(s.code && item.code && norm(s.code) !== norm(item.code)));
}

const STOP = new Set(["and", "of", "the", "to", "in", "for", "a"]);
const words = (s: string) => norm(s).replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w));
const isLab = (s: string) => /\blab(oratory)?\b/i.test(s);
const initials = (s: string) => words(s).map((w) => w[0]).join("");

export function similarity(a: string, b: string): number {
  if (isLab(a) !== isLab(b)) return 0; // never merge a theory subject with its lab
  const A = new Set(words(a));
  const B = new Set(words(b));
  if (A.size === 0 || B.size === 0) return 0;
  const inter = [...A].filter((w) => B.has(w)).length;
  const jaccard = inter / (A.size + B.size - inter);
  const compact = (s: string) => norm(s).replace(/[^a-z0-9]/g, "");
  const acronym = initials(a) === compact(b) || initials(b) === compact(a) ? 0.9 : 0; // "DBMS" <-> "Database Management Systems"
  return Math.max(jaccard, acronym);
}

// Best guess for "which of MY subjects is this pack subject?" (null = probably a new subject).
export function suggestSubject<T extends { id: string; name: string }>(item: { name: string }, mine: T[]): { id: string; score: number } | null {
  let best: { id: string; score: number } | null = null;
  for (const s of mine) {
    const score = similarity(item.name, s.name);
    if (score >= 0.6 && (!best || score > best.score)) best = { id: s.id, score };
  }
  return best;
}
