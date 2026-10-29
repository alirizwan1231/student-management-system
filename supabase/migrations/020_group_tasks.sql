-- 020_group_tasks.sql
-- Group tasks (weekly planner): shared tasks per study group, per-member
-- completion, optional weekly repeat, notes attached to a task, and a group
-- setting that says who may add tasks. Safe to re-run.

alter table groups add column if not exists tasks_policy text not null default 'everyone'
  check (tasks_policy in ('everyone', 'staff'));

create table if not exists group_tasks (
  id uuid primary key,
  group_id uuid not null references groups(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  subject_name text,
  due_date date,
  week_start date not null,                 -- Monday of the week this task belongs to
  assignee_ids uuid[],                      -- null = everyone in the group
  repeat_weekly boolean not null default false,
  series_id uuid,                           -- same for every weekly copy of one task
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_group_tasks_group on group_tasks(group_id, week_start);
create unique index if not exists uq_group_tasks_series_week on group_tasks(series_id, week_start) where series_id is not null;

create table if not exists group_task_completions (
  task_id uuid not null references group_tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (task_id, user_id)
);

-- A shared note can belong to a specific group task ("this note is for this task").
alter table group_shared_items add column if not exists group_task_id uuid references group_tasks(id) on delete set null;
create index if not exists idx_shared_items_task on group_shared_items(group_task_id);

-- ============== helpers ==============
create or replace function is_group_staff(gid uuid) returns boolean as $$
  select coalesce(get_group_role(gid) in ('owner', 'moderator'), false);
$$ language sql security definer stable;

create or replace function group_allows_member_tasks(gid uuid) returns boolean as $$
  select exists (select 1 from groups g where g.id = gid and (g.tasks_policy = 'everyone' or is_group_staff(gid)));
$$ language sql security definer stable;

-- ============== RLS ==============
alter table group_tasks enable row level security;
drop policy if exists "group_tasks_select_member" on group_tasks;
create policy "group_tasks_select_member" on group_tasks for select using (is_group_member(group_id));
drop policy if exists "group_tasks_insert" on group_tasks;
create policy "group_tasks_insert" on group_tasks for insert
  with check (created_by = auth.uid() and is_group_member(group_id) and group_allows_member_tasks(group_id));
drop policy if exists "group_tasks_update" on group_tasks;
create policy "group_tasks_update" on group_tasks for update
  using (created_by = auth.uid() or is_group_staff(group_id))
  with check (is_group_member(group_id) and (created_by = auth.uid() or is_group_staff(group_id)));

alter table group_task_completions enable row level security;
-- You see your own ticks; owners/moderators see everyone's.
drop policy if exists "task_completions_select" on group_task_completions;
create policy "task_completions_select" on group_task_completions for select
  using (user_id = auth.uid() or exists (select 1 from group_tasks t where t.id = task_id and is_group_staff(t.group_id)));
drop policy if exists "task_completions_insert_own" on group_task_completions;
create policy "task_completions_insert_own" on group_task_completions for insert
  with check (user_id = auth.uid() and exists (select 1 from group_tasks t where t.id = task_id and is_group_member(t.group_id)));
drop policy if exists "task_completions_delete_own" on group_task_completions;
create policy "task_completions_delete_own" on group_task_completions for delete using (user_id = auth.uid());

-- ============== notifications ==============
create or replace function trg_notify_on_group_task() returns trigger as $$
begin
  insert into group_notifications (id, group_id, user_id, type, message)
  select uuid_generate_v4(), new.group_id, gm.user_id, 'group_task', 'New group task: ' || left(new.title, 80)
  from group_members gm
  where gm.group_id = new.group_id
    and gm.user_id <> new.created_by
    and (new.assignee_ids is null or gm.user_id = any(new.assignee_ids));
  return new;
end;
$$ language plpgsql security definer;
drop trigger if exists on_group_task_insert on group_tasks;
create trigger on_group_task_insert after insert on group_tasks
  for each row execute procedure trg_notify_on_group_task();

-- ============== RPCs ==============
-- How many members finished each task (counts only; names stay staff-only).
create or replace function group_task_progress(p_group_id uuid)
returns table(task_id uuid, done_count integer) as $$
begin
  if not is_group_member(p_group_id) then raise exception 'Not a member of this group'; end if;
  return query
    select t.id, count(c.user_id)::integer
    from group_tasks t
    left join group_task_completions c on c.task_id = t.id
    where t.group_id = p_group_id and t.deleted_at is null
    group by t.id;
end;
$$ language plpgsql security definer;

-- Creates this week's copy of every repeating task whose latest copy is older.
-- Idempotent: the unique (series_id, week_start) index prevents duplicates.
create or replace function roll_group_weekly_tasks(p_group_id uuid, p_week_start date)
returns integer as $$
declare created integer := 0;
begin
  if not is_group_member(p_group_id) then raise exception 'Not a member of this group'; end if;
  if p_week_start < current_date - 7 or p_week_start > current_date + 7 then raise exception 'Invalid week'; end if;
  insert into group_tasks (id, group_id, created_by, title, description, subject_name, due_date, week_start, assignee_ids, repeat_weekly, series_id)
  select uuid_generate_v4(), t.group_id, t.created_by, t.title, t.description, t.subject_name,
         case when t.due_date is null then null else t.due_date + (p_week_start - t.week_start) end,
         p_week_start, t.assignee_ids, true, t.series_id
  from (
    select distinct on (series_id) * from group_tasks
    where group_id = p_group_id and series_id is not null
    order by series_id, week_start desc
  ) t
  where t.repeat_weekly and t.deleted_at is null and t.week_start < p_week_start
  on conflict do nothing;
  get diagnostics created = row_count;
  return created;
end;
$$ language plpgsql security definer;
