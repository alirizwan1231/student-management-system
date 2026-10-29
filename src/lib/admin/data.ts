import { createAdminClient } from "@/lib/supabase/admin";
export async function fetchDashboardStats() {
  const supabase = createAdminClient();
  const num = (r: { count: number | null; error: { message: string } | null }) => {
    if (r.error) throw new Error(r.error.message);
    return r.count ?? 0;
  };
  const countTable = async (table: string) => {
    const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true }).is("deleted_at", null);
    if (error) throw new Error(`${table}: ${error.message}`);
    return count ?? 0;
  };
  const [totalStudents, totalAdmins, totalSemesters, totalSubjects, totalLectures, totalTasks, totalResources, overdueTasks] =
    await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student").then(num),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin").then(num),
      countTable("semesters"),
      countTable("subjects"),
      countTable("lectures"),
      countTable("tasks"),
      countTable("resources"),
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null)
        .neq("status", "completed")
        .lt("deadline", new Date().toISOString())
        .then(num),
    ]);
  // Best-effort: capped at 1000 users so this stays fast. For larger
  // user bases this should move to a scheduled job writing a summary row
  // instead of scanning auth.users live.
  let activeUsers = 0;
  try {
    const { data } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    activeUsers = (data?.users ?? []).filter((u) => u.last_sign_in_at && new Date(u.last_sign_in_at).getTime() > cutoff).length;
  } catch {
    activeUsers = 0;
  }
  return {
    totalUsers: totalStudents + totalAdmins,
    totalStudents,
    totalAdmins,
    activeUsers,
    totalSemesters,
    totalSubjects,
    totalLectures,
    totalTasks,
    totalResources,
    overdueTasks,
  };
}
export interface AdminUserRow {
  id: string;
  full_name: string | null;
  email: string | null;
  role: "student" | "admin";
  created_at: string;
  disabled_at: string | null;
  counts: {
    semester_count: number;
    subject_count: number;
    lecture_count: number;
    task_count: number;
    resource_count: number;
  };
}
export async function fetchUsersPage(params: {
  search?: string;
  role?: "student" | "admin" | "all";
  page: number;
  pageSize: number;
}): Promise<{ users: AdminUserRow[]; total: number }> {
  const supabase = createAdminClient();
  const { search, role = "all", page, pageSize } = params;
  let query = supabase.from("profiles").select("id, full_name, email, role, created_at, disabled_at", { count: "exact" });
  if (role !== "all") query = query.eq("role", role);
  if (search?.trim()) {
    const term = search.trim().replace(/[%_]/g, "");
    query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%`);
  }
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, count, error } = await query.order("created_at", { ascending: false }).range(from, to);
  if (error) throw error;
  const ids = (data ?? []).map((u) => u.id);
  const countsById = new Map<string, AdminUserRow["counts"]>();
  if (ids.length > 0) {
    const { data: countRows } = await supabase.rpc("admin_user_counts", { target_ids: ids });
    for (const row of countRows ?? []) {
      countsById.set(row.user_id, {
        semester_count: row.semester_count,
        subject_count: row.subject_count,
        lecture_count: row.lecture_count,
        task_count: row.task_count,
        resource_count: row.resource_count,
      });
    }
  }
  return {
    users: (data ?? []).map((u) => ({
      ...u,
      counts: countsById.get(u.id) ?? { semester_count: 0, subject_count: 0, lecture_count: 0, task_count: 0, resource_count: 0 },
    })),
    total: count ?? 0,
  };
}
export async function fetchUserProfile(userId: string) {
  const supabase = createAdminClient();
  const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error || !profile) return null;
  let lastSignInAt: string | null = null;
  try {
    const { data } = await supabase.auth.admin.getUserById(userId);
    lastSignInAt = data.user?.last_sign_in_at ?? null;
  } catch {
    lastSignInAt = null;
  }
const { data: countRows } = await supabase.rpc("admin_user_counts", { target_ids: [userId] });
  const counts = countRows?.[0] ?? { semester_count: 0, subject_count: 0, lecture_count: 0, task_count: 0, resource_count: 0 };
  return { profile, lastSignInAt, counts };
}
export async function fetchUserSemesters(userId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("semesters")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("number", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
export async function fetchUserSubjects(userId: string, semesterId?: string) {
  const supabase = createAdminClient();
  let query = supabase.from("subjects").select("*").eq("user_id", userId).is("deleted_at", null);
  if (semesterId) query = query.eq("semester_id", semesterId);
  const { data, error } = await query.order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
export async function fetchUserLectures(userId: string, subjectId?: string) {
  const supabase = createAdminClient();
  let query = supabase.from("lectures").select("*").eq("user_id", userId).is("deleted_at", null);
  if (subjectId) query = query.eq("subject_id", subjectId);
  const { data, error } = await query.order("lecture_number", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
export async function fetchUserTasks(userId: string, subjectId?: string) {
  const supabase = createAdminClient();
  let query = supabase.from("tasks").select("*").eq("user_id", userId).is("deleted_at", null);
  if (subjectId) query = query.eq("subject_id", subjectId);
  const { data, error } = await query.order("deadline", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}
export async function fetchUserResources(userId: string, filters?: { subjectId?: string; lectureId?: string; taskId?: string }) {
  const supabase = createAdminClient();
  let query = supabase.from("resources").select("*").eq("user_id", userId).is("deleted_at", null);
  if (filters?.subjectId) query = query.eq("subject_id", filters.subjectId);
  if (filters?.lectureId) query = query.eq("lecture_id", filters.lectureId);
  if (filters?.taskId) query = query.eq("task_id", filters.taskId);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
export interface SearchResult {
  kind: "user" | "subject" | "lecture" | "task" | "resource";
  id: string;
  title: string;
  ownerUserId: string;
  ownerName: string;
  href: string;
}
export async function globalSearch(term: string): Promise<SearchResult[]> {
  const supabase = createAdminClient();
  const q = term.trim().replace(/[%_]/g, "");
  if (!q) return [];
  const [users, subjects, lectures, tasks, resources] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email").or(`full_name.ilike.%${q}%,email.ilike.%${q}%`).limit(10),
    supabase.from("subjects").select("id, name, user_id").ilike("name", `%${q}%`).is("deleted_at", null).limit(10),
    supabase.from("lectures").select("id, title, user_id, subject_id").ilike("title", `%${q}%`).is("deleted_at", null).limit(10),
    supabase.from("tasks").select("id, title, user_id, subject_id").ilike("title", `%${q}%`).is("deleted_at", null).limit(10),
    supabase.from("resources").select("id, title, user_id").ilike("title", `%${q}%`).is("deleted_at", null).limit(10),
  ]);
const ownerIds = new Set<string>();
  for (const row of [...(subjects.data ?? []), ...(lectures.data ?? []), ...(tasks.data ?? []), ...(resources.data ?? [])]) {
    ownerIds.add((row as { user_id: string }).user_id);
  }
  const { data: owners } = ownerIds.size
    ? await supabase.from("profiles").select("id, full_name, email").in("id", [...ownerIds])
    : { data: [] as { id: string; full_name: string | null; email: string | null }[] };
  const ownerName = new Map<string, string>((owners ?? []).map((o) => [o.id, o.full_name || o.email || "User"]));
  const results: SearchResult[] = [];
  for (const u of users.data ?? []) {
    results.push({ kind: "user", id: u.id, title: u.full_name || u.email || "User", ownerUserId: u.id, ownerName: u.email ?? "", href: `/admin/users/${u.id}` });
  }
  for (const s of subjects.data ?? []) {
    results.push({ kind: "subject", id: s.id, title: s.name, ownerUserId: s.user_id, ownerName: ownerName.get(s.user_id) ?? "User", href: `/admin/users/${s.user_id}?tab=subjects` });
  }
  for (const l of lectures.data ?? []) {
    results.push({ kind: "lecture", id: l.id, title: l.title, ownerUserId: l.user_id, ownerName: ownerName.get(l.user_id) ?? "User", href: `/admin/users/${l.user_id}?tab=lectures&subject=${l.subject_id}` });
  }
  for (const t of tasks.data ?? []) {
    results.push({ kind: "task", id: t.id, title: t.title, ownerUserId: t.user_id, ownerName: ownerName.get(t.user_id) ?? "User", href: `/admin/users/${t.user_id}?tab=tasks&subject=${t.subject_id}` });
  }
  for (const r of resources.data ?? []) {
    results.push({ kind: "resource", id: r.id, title: r.title, ownerUserId: r.user_id, ownerName: ownerName.get(r.user_id) ?? "User", href: `/admin/users/${r.user_id}?tab=resources` });
  }
  return results;
}


export interface AnalyticsData {
  days: string[]; // yyyy-MM-dd (UTC), oldest first
  signups: number[];
  tasks: number[];
  lectures: number[];
  resources: number[];
  taskStatus: { label: string; value: number }[];
  resourceTypes: { label: string; value: number }[];
  attendance: { label: string; value: number }[] | null;
  upcomingExams: number | null;
}

export async function fetchAnalytics(rangeDays: number): Promise<AnalyticsData> {
  const supabase = createAdminClient();
  const n = Math.min(Math.max(Math.round(rangeDays) || 30, 7), 90);
  const days: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    days.push(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i)).toISOString().slice(0, 10));
  }
  const since = `${days[0]}T00:00:00.000Z`;
  const index = new Map(days.map((d, i) => [d, i] as const));

  const bucket = async (table: string, softDeleted: boolean): Promise<number[]> => {
    const out = new Array<number>(n).fill(0);
    let q = supabase.from(table).select("created_at").gte("created_at", since).limit(20000);
    if (softDeleted) q = q.is("deleted_at", null);
    const { data } = await q;
    for (const row of (data ?? []) as { created_at: string }[]) {
      const i = index.get(row.created_at.slice(0, 10));
      if (i !== undefined) out[i] += 1;
    }
    return out;
  };
  const count = async (table: string, column: string, value: string, softDeleted = true) => {
    let q = supabase.from(table).select("id", { count: "exact", head: true }).eq(column, value);
    if (softDeleted) q = q.is("deleted_at", null);
    const { count: c } = await q;
    return c ?? 0;
  };

  const [signups, tasks, lectures, resources] = await Promise.all([
    bucket("profiles", false),
    bucket("tasks", true),
    bucket("lectures", true),
    bucket("resources", true),
  ]);

  const taskStatuses = ["pending", "in_progress", "completed", "overdue"];
  const resourceKinds = ["pdf", "ppt", "doc", "image", "link", "other"];
  const [taskCounts, resourceCounts] = await Promise.all([
    Promise.all(taskStatuses.map((s) => count("tasks", "status", s))),
    Promise.all(resourceKinds.map((k) => count("resources", "resource_type", k))),
  ]);

  // Attendance + exams come from a later migration; tolerate it missing.
  let attendance: AnalyticsData["attendance"] = null;
  let upcomingExams: number | null = null;
  try {
    const statuses = ["present", "late", "absent", "excused"];
    const counts = await Promise.all(statuses.map((s) => count("attendance_records", "status", s)));
    attendance = statuses.map((s, i) => ({ label: s[0].toUpperCase() + s.slice(1), value: counts[i] }));
    const { count: exams, error } = await supabase
      .from("exams")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .gte("exam_date", days[n - 1]);
    upcomingExams = error ? null : exams ?? 0;
  } catch {
    attendance = null;
  }

  return {
    days,
    signups,
    tasks,
    lectures,
    resources,
    taskStatus: taskStatuses.map((s, i) => ({ label: s.replace("_", " ").replace(/^./, (c) => c.toUpperCase()), value: taskCounts[i] })),
    resourceTypes: resourceKinds.map((k, i) => ({ label: k.toUpperCase(), value: resourceCounts[i] })),
    attendance,
    upcomingExams,
  };
}
