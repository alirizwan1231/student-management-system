-- 012_admin_role_and_audit.sql
-- 1. Role enum + columns on profiles
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('student', 'admin');
  end if;
end$$;
alter table profiles add column if not exists role user_role not null default 'student';
alter table profiles add column if not exists email text;
alter table profiles add column if not exists disabled_at timestamptz;
create index if not exists idx_profiles_role on profiles(role);
create index if not exists idx_profiles_email on profiles(email);
create index if not exists idx_profiles_created_at on profiles(created_at);
-- Backfill email for existing profiles (safe to rerun, only fills nulls).
update profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is null;
-- Idempotent profile creation: signing up twice, or a webhook retry, never
-- creates a duplicate profile row for the same auth.users.id.
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
-- 2. is_admin() -- used by every admin-bypass RLS policy below.
create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin' and disabled_at is null
  );
$$ language sql security definer stable;
-- 3. Extend RLS: admin gets access IN ADDITION to each user's own-row
-- policy (Postgres OR's permissive policies together -- nothing existing
-- is removed or weakened).
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'semesters', 'subjects', 'lectures', 'tasks', 'resources', 'lecturers'
  ])
  loop
    execute format('drop policy if exists "%1$s_admin_all" on %1$s;', t);
    execute format(
      'create policy "%1$s_admin_all" on %1$s for all using (is_admin()) with check (is_admin());',
      t
    );
  end loop;
end$$;
drop policy if exists "profiles_admin_read" on profiles;
create policy "profiles_admin_read" on profiles
  for select using (is_admin());
drop policy if exists "profiles_admin_update_role" on profiles;
create policy "profiles_admin_update_role" on profiles
  for update using (is_admin()) with check (is_admin());
-- 4. Audit log
create table if not exists admin_audit_log (
  id uuid primary key default uuid_generate_v4(),
  admin_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_user_id uuid references auth.users(id) on delete set null,
  target_record_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_admin on admin_audit_log(admin_id);
create index if not exists idx_audit_target_user on admin_audit_log(target_user_id);
create index if not exists idx_audit_created_at on admin_audit_log(created_at);
alter table admin_audit_log enable row level security;
drop policy if exists "audit_log_admin_read" on admin_audit_log;
create policy "audit_log_admin_read" on admin_audit_log
  for select using (is_admin());
-- No insert policy for normal clients -- all inserts happen via the
-- server's service-role client, which bypasses RLS by design.
-- 5. Fast per-user counts for the admin users list (avoids loading full
-- academic data just to show numbers).
create or replace function admin_user_counts(target_ids uuid[])
returns table (
  user_id uuid,
  semester_count bigint,
  subject_count bigint,
  lecture_count bigint,
  task_count bigint,
  resource_count bigint
) as $$
  select
    u.id as user_id,
    (select count(*) from semesters s where s.user_id = u.id and s.deleted_at is null) as semester_count,
    (select count(*) from subjects sub where sub.user_id = u.id and sub.deleted_at is null) as subject_count,
    (select count(*) from lectures l where l.user_id = u.id and l.deleted_at is null) as lecture_count,
    (select count(*) from tasks t where t.user_id = u.id and t.deleted_at is null) as task_count,
    (select count(*) from resources r where r.user_id = u.id and r.deleted_at is null) as resource_count
  from unnest(target_ids) as u(id);
$$ language sql security definer stable;
grant execute on function admin_user_counts(uuid[]) to authenticated;
