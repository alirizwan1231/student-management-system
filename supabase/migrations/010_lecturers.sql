-- 010_lecturers.sql
-- Instructors as a real, personal entity (not just a text field on
-- subjects), so subjects/tasks can be grouped and linked by instructor.

create table if not exists lecturers (
  id uuid primary key,                 -- client-generated UUID (offline-safe)
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_lecturers_user on lecturers(user_id);

alter table lecturers enable row level security;

drop policy if exists "lecturers_own" on lecturers;
create policy "lecturers_own" on lecturers
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
