-- 019_grades_and_notifications.sql
-- Grade book (GPA tracker) and email-reminder preferences. Safe to re-run.

create table if not exists grade_entries (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  title text not null,
  category text not null default 'assignment'
    check (category in ('assignment', 'quiz', 'midterm', 'final', 'project', 'lab', 'other')),
  score numeric(8, 2) not null check (score >= 0),
  max_score numeric(8, 2) not null check (max_score > 0),
  weight numeric(6, 2) check (weight is null or (weight >= 0 and weight <= 100)),
  graded_on date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_grade_entries_user on grade_entries(user_id);
create index if not exists idx_grade_entries_subject on grade_entries(subject_id);
create index if not exists idx_grade_entries_updated on grade_entries(updated_at);

alter table grade_entries enable row level security;
drop policy if exists "grade_entries_own" on grade_entries;
create policy "grade_entries_own" on grade_entries
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "grade_entries_admin_all" on grade_entries;
create policy "grade_entries_admin_all" on grade_entries
  for all using (is_admin()) with check (is_admin());

-- Per-user notification settings (read by the daily email digest job).
create table if not exists notification_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_digest boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table notification_prefs enable row level security;
drop policy if exists "notification_prefs_own" on notification_prefs;
create policy "notification_prefs_own" on notification_prefs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
