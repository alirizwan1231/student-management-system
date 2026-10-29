import type { GradeEntry } from "@/types/grades";

// 4.0 scale (HEC Pakistan style). Edit these rows to match your university.
export interface GradeScaleRow {
  min: number; // minimum percentage for this grade
  letter: string;
  points: number;
}
export const GRADE_SCALE: GradeScaleRow[] = [
  { min: 85, letter: "A", points: 4.0 },
  { min: 80, letter: "A-", points: 3.67 },
  { min: 75, letter: "B+", points: 3.33 },
  { min: 71, letter: "B", points: 3.0 },
  { min: 68, letter: "B-", points: 2.67 },
  { min: 64, letter: "C+", points: 2.33 },
  { min: 61, letter: "C", points: 2.0 },
  { min: 58, letter: "C-", points: 1.67 },
  { min: 54, letter: "D+", points: 1.33 },
  { min: 50, letter: "D", points: 1.0 },
  { min: 0, letter: "F", points: 0 },
];

export function gradeFor(percentage: number): GradeScaleRow {
  return GRADE_SCALE.find((r) => percentage >= r.min) ?? GRADE_SCALE[GRADE_SCALE.length - 1];
}

export interface SubjectGrade {
  percentage: number | null;
  weightedPoints: number; // sum of (score/max * weight) over weighted entries
  weightSum: number; // total weight already graded (0 if weights are unused)
  count: number;
}

// If any entry has a weight, the subject % is the weighted average of the
// graded entries. Otherwise every entry counts equally.
export function subjectGrade(entries: GradeEntry[]): SubjectGrade {
  const live = entries.filter((e) => !e.deleted_at && Number(e.max_score) > 0);
  if (live.length === 0) return { percentage: null, weightedPoints: 0, weightSum: 0, count: 0 };
  const ratio = (e: GradeEntry) => Number(e.score) / Number(e.max_score);
  const weighted = live.filter((e) => Number(e.weight ?? 0) > 0);
  if (weighted.length > 0) {
    const weightSum = weighted.reduce((a, e) => a + Number(e.weight), 0);
    const weightedPoints = weighted.reduce((a, e) => a + ratio(e) * Number(e.weight), 0);
    return { percentage: (weightedPoints / weightSum) * 100, weightedPoints, weightSum, count: live.length };
  }
  const mean = live.reduce((a, e) => a + ratio(e), 0) / live.length;
  return { percentage: mean * 100, weightedPoints: 0, weightSum: 0, count: live.length };
}

// Credit-weighted GPA over subjects that have a percentage.
export function computeGpa(rows: { percentage: number; credits: number }[]): number | null {
  const credits = rows.reduce((a, r) => a + r.credits, 0);
  if (credits === 0) return null;
  return rows.reduce((a, r) => a + gradeFor(r.percentage).points * r.credits, 0) / credits;
}

// Average % needed on the part of the course that is still ungraded to end
// with `target`%. Only meaningful when weights are used and sum to < 100.
export function neededOnRemaining(g: SubjectGrade, target: number): { needed: number; remaining: number } | null {
  if (g.weightSum <= 0 || g.weightSum >= 100) return null;
  const remaining = 100 - g.weightSum;
  return { needed: ((target - g.weightedPoints) / remaining) * 100, remaining };
}
