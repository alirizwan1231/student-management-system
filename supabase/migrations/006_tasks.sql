-- 006_tasks.sql
do $$
begin
  if not exists (select 1 from pg_type where typname = 'task_type') then
    create type task_type as enum
      ('assignment', 'lab', 'quiz', 'presentation', 'project', 'other');
  end if;
  if not exists (select 1 from pg_type where typname = 'task_status') then
    create type task_status as enum
      ('pending', 'in_progress', 'completed', 'overdue');
  end if;
  if not exists (select 1 from pg_type where typname = 'task_priority') then
    create type task_priority as enum ('low', 'medium', 'high');
  end if;
end$$;

create table if not exists tasks (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  title text not null,
  description text,
  task_type task_type not null default 'assignment',
  deadline timestamptz,
  status task_status not null default 'pending',
  priority task_priority not null default 'medium',
  marks numeric,
  storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_tasks_user on tasks(user_id);
create index if not exists idx_tasks_subject on tasks(subject_id);
create index if not exists idx_tasks_deadline on tasks(deadline);
create index if not exists idx_tasks_user_status on tasks(user_id, status);
