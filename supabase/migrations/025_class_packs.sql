-- 025_class_packs.sql
-- Class pack: the class representative publishes subjects, instructors, timetable, notes, tasks and exams
-- once; every group member can import them into their own account. Safe to re-run.

create table if not exists class_packs (
  group_id uuid primary key references groups(id) on delete cascade,
  version integer not null default 1,
  published_by uuid not null references auth.users(id),
  title text not null,
  payload jsonb not null,
  published_at timestamptz not null default now()
);

alter table class_packs enable row level security;

-- Members can read the pack. Nobody writes the table directly: publishing goes through the
-- function below (026), which checks that the caller is the owner or a moderator.
drop policy if exists "class_packs_select_member" on class_packs;
create policy "class_packs_select_member" on class_packs for select using (is_group_member(group_id));
