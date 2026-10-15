-- 015_timetable_extensions.sql
-- Extends existing timetable_slots (not a new table) + adds exceptions so a
-- single occurrence can be cancelled/moved without touching the recurring rule.
alter table timetable_slots add column if not exists lecturer_id uuid references lecturers(id) on delete set null;
alter table timetable_slots add column if not exists color text;
alter table timetable_slots add column if not exists start_date date;
alter table timetable_slots add column if not exists end_date date;
create index if not exists idx_timetable_lecturer on timetable_slots(lecturer_id);
do $$
begin
  if not exists (select 1 from pg_type where typname = 'timetable_exception_type') then
    create type timetable_exception_type as enum ('cancelled', 'moved');
  end if;
end$$;
create table if not exists timetable_exceptions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  timetable_slot_id uuid not null references timetable_slots(id) on delete cascade,
  occurrence_date date not null,      -- the originally-scheduled date being overridden
  exception_type timetable_exception_type not null,
  new_date date,                      -- for "moved": which date it moves TO
  new_start_time time,
  new_end_time time,
  new_subject_id uuid references subjects(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (timetable_slot_id, occurrence_date)
);
create index if not exists idx_tt_exceptions_user on timetable_exceptions(user_id);
create index if not exists idx_tt_exceptions_slot on timetable_exceptions(timetable_slot_id); alter table timetable_exceptions enable row level security;
drop policy if exists "timetable_exceptions_own" on timetable_exceptions;
create policy "timetable_exceptions_own" on timetable_exceptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
