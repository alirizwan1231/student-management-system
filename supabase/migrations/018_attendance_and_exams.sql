-- 018_attendance_and_exams.sql
-- Attendance tracking (per class, per day) and exam schedule.
-- Safe to run more than once.

create table if not exists attendance_records (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  timetable_slot_id uuid references timetable_slots(id) on delete set null,
  attendance_date date not null,
  status text not null check (status in ('present', 'absent', 'late', 'excused')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_attendance_user on attendance_records(user_id);
create index if not exists idx_attendance_subject on attendance_records(subject_id);
create index if not exists idx_attendance_date on attendance_records(attendance_date);
create index if not exists idx_attendance_updated on attendance_records(updated_at);

create table if not exists exams (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  title text not null,
  exam_type text not null default 'other' check (exam_type in ('midterm', 'final', 'quiz', 'viva', 'practical', 'other')),
  exam_date date not null,
  start_time time,
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  room text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_exams_user on exams(user_id);
create index if not exists idx_exams_subject on exams(subject_id);
create index if not exists idx_exams_date on exams(exam_date);
create index if not exists idx_exams_updated on exams(updated_at);

alter table attendance_records enable row level security;
alter table exams enable row level security;

drop policy if exists "attendance_records_own" on attendance_records;
create policy "attendance_records_own" on attendance_records
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "exams_own" on exams;
create policy "exams_own" on exams
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Admins can read everything (used by the admin analytics page).
drop policy if exists "attendance_records_admin_all" on attendance_records;
create policy "attendance_records_admin_all" on attendance_records
  for all using (is_admin()) with check (is_admin());
drop policy if exists "exams_admin_all" on exams;
create policy "exams_admin_all" on exams
  for all using (is_admin()) with check (is_admin());
