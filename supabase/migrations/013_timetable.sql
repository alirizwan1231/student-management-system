-- 013_timetable.sql
-- Weekly recurring class schedule -- independent of lecture notes (lectures
-- are content, not scheduled events; this is the actual timetable).
create table if not exists timetable_slots (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0=Mon .. 6=Sun
  start_time time not null,
  end_time time not null,
  room text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_timetable_user on timetable_slots(user_id);
create index if not exists idx_timetable_subject on timetable_slots(subject_id);
alter table timetable_slots enable row level security;
drop policy if exists "timetable_slots_own" on timetable_slots;
create policy "timetable_slots_own" on timetable_slots
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
