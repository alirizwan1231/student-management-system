-- 004_subjects.sql
create table if not exists subjects (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  semester_id uuid not null references semesters(id) on delete cascade,
  name text not null,
  code text,
  lecturer_name text,
  description text,
  credit_hours numeric,
  color text default '#3366ff',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_subjects_user on subjects(user_id);
create index if not exists idx_subjects_semester on subjects(semester_id);
