-- 027_audit_fixes_2026_10_29.sql
-- =====================================================================
-- All database-level fixes from the 2026-10-25 audit (see the audit report
-- + fix guide, Fixes 1, 7 and 8). Safe to run ONCE in the Supabase SQL
-- Editor; every statement is idempotent / guarded where practical.
--
-- WHY THIS FILE EXISTS: the browser talks directly to Supabase, so the
-- database IS the API. Rules that live only in React can be bypassed with
-- the public anon key + any signed-in user's own token.
-- =====================================================================

-- ---------------------------------------------------------------------
-- FIX 1 (CRITICAL, audit C-1): users must not be able to promote
-- themselves to admin, un-ban themselves, or rewrite their profile email.
-- ---------------------------------------------------------------------
-- 1A. Column-level lockdown. Postgres ignores a column-level REVOKE when
-- the privilege was granted at table level, so revoke the table grant
-- first, then grant back ONLY the safe columns.
revoke update on public.profiles from authenticated;
revoke update on public.profiles from anon;
grant update (full_name, avatar_url, updated_at) on public.profiles to authenticated;
-- service_role keeps its own full grants, so the server-side admin routes
-- (/api/admin/users/[userId]/role and /status, which verify the caller is
-- an admin and then use the service-role key) keep working unchanged.

-- 1B. Defence in depth: a trigger that rejects privileged-field changes
-- from any non-service caller, even if a grant is re-added by mistake.
create or replace function public.protect_profile_privileged_fields()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('postgres', 'service_role', 'supabase_admin')
     or coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.disabled_at is distinct from old.disabled_at
     or new.email is distinct from old.email then
    raise exception 'You cannot change role, disabled_at or email';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_profile_fields on public.profiles;
create trigger trg_protect_profile_fields
  before update on public.profiles
  for each row execute function public.protect_profile_privileged_fields();

-- ---------------------------------------------------------------------
-- FIX 8 (audit M-2): validation that cannot be bypassed.
-- Added as NOT VALID so this migration cannot fail on pre-existing bad
-- rows (the audit created one reversed-dates semester on purpose).
-- After you fix/delete any old bad rows (queries in the step-by-step
-- guide), run the VALIDATE statements at the bottom of this section.
-- ---------------------------------------------------------------------
alter table public.semesters drop constraint if exists semesters_dates_order;
alter table public.semesters add constraint semesters_dates_order
  check (end_date is null or start_date is null or end_date >= start_date) not valid;
alter table public.semesters drop constraint if exists semesters_number_positive;
alter table public.semesters add constraint semesters_number_positive
  check (number > 0) not valid;

alter table public.subjects drop constraint if exists subjects_credit_hours_range;
alter table public.subjects add constraint subjects_credit_hours_range
  check (credit_hours is null or (credit_hours >= 1 and credit_hours <= 30)) not valid;

alter table public.timetable_slots drop constraint if exists timetable_time_order;
alter table public.timetable_slots add constraint timetable_time_order
  check (end_time > start_time) not valid;

alter table public.grade_entries drop constraint if exists grade_entries_score_within_max;
alter table public.grade_entries add constraint grade_entries_score_within_max
  check (score <= max_score) not valid;

alter table public.exams drop constraint if exists exams_duration_positive;
alter table public.exams add constraint exams_duration_positive
  check (duration_minutes is null or duration_minutes > 0) not valid;

-- After cleaning old rows, enforce the constraints on ALL rows:
-- alter table public.semesters validate constraint semesters_dates_order;
-- alter table public.semesters validate constraint semesters_number_positive;
-- alter table public.subjects validate constraint subjects_credit_hours_range;
-- alter table public.timetable_slots validate constraint timetable_time_order;
-- alter table public.grade_entries validate constraint grade_entries_score_within_max;
-- alter table public.exams validate constraint exams_duration_positive;

-- ---------------------------------------------------------------------
-- FIX 7 (audit M-1): strong, expiring group invite codes; throttled
-- join attempts; a preview that leaks nothing but the group name.
-- Old 8-character hex codes (~32 bits) are replaced by 16 characters
-- from a 32-symbol unambiguous alphabet (~80 bits), generated from
-- pgcrypto random bytes. Existing groups keep working until their code
-- is regenerated or they are re-created -- regenerating a code from the
-- group page upgrades that group immediately. NOTE: after this
-- migration, EXISTING codes get a 7-day expiry starting now; tell group
-- owners to regenerate and re-share if their link stops working.
-- ---------------------------------------------------------------------
alter table public.groups
  add column if not exists invite_code_expires_at timestamptz;

update public.groups
set invite_code_expires_at = now() + interval '7 days'
where invite_code_expires_at is null;

create table if not exists public.group_join_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  attempted_at timestamptz not null default now(),
  success boolean not null default false
);
create index if not exists idx_join_attempts_user_time
  on public.group_join_attempts(user_id, attempted_at);
alter table public.group_join_attempts enable row level security;
-- No policies on purpose: only the SECURITY DEFINER functions below
-- read/write this table.

create or replace function public.generate_invite_code()
returns text
language plpgsql
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O/1/I
  bytes bytea := gen_random_bytes(16);
  code text := '';
  i int;
begin
  for i in 0..15 loop
    code := code || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
  end loop;
  return code;
end;
$$;

-- create_group: same contract as migration 014, strong code + expiry.
create or replace function public.create_group(p_name text, p_description text, p_subject_id uuid, p_semester_id uuid)
returns public.groups as $$
declare
  g public.groups;
  code text;
begin
  code := public.generate_invite_code();
  insert into public.groups (id, owner_id, name, description, subject_id, semester_id, invite_code, invite_code_expires_at)
  values (uuid_generate_v4(), auth.uid(), p_name, p_description, p_subject_id, p_semester_id, code, now() + interval '7 days')
  returning * into g;
  insert into public.group_members (id, group_id, user_id, role)
  values (uuid_generate_v4(), g.id, auth.uid(), 'owner');
  return g;
end;
$$ language plpgsql security definer;

-- join_group_by_code: RETURN TYPE CHANGES from `groups` to jsonb, so the
-- old function is dropped first. It returns ONLY {id, name}: a joining
-- member must not receive the invite_code in the response (previously the
-- full row, code included, came back). Plus normalisation (dashes /
-- spaces / case), expiry enforcement and per-user throttling
-- (10 failed attempts per hour).
drop function if exists public.join_group_by_code(text);
create or replace function public.join_group_by_code(p_code text)
returns jsonb as $$
declare
  g public.groups;
  clean text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  failed int;
begin
  select count(*) into failed
  from public.group_join_attempts
  where user_id = auth.uid() and success = false
    and attempted_at > now() - interval '1 hour';
  if failed >= 10 then
    raise exception 'Too many failed attempts. Try again in an hour.';
  end if;

  select * into g from public.groups
  where invite_code = clean and deleted_at is null;

  if g.id is null then
    insert into public.group_join_attempts (user_id, success) values (auth.uid(), false);
    raise exception 'Invalid invite code';
  end if;
  if g.invite_code_expires_at is not null and g.invite_code_expires_at < now() then
    insert into public.group_join_attempts (user_id, success) values (auth.uid(), false);
    raise exception 'This invite code has expired. Ask the group owner to regenerate it.';
  end if;
  if exists (select 1 from public.group_members where group_id = g.id and user_id = auth.uid()) then
    raise exception 'You are already a member of this group';
  end if;

  insert into public.group_join_attempts (user_id, success) values (auth.uid(), true);
  insert into public.group_members (id, group_id, user_id, role)
  values (uuid_generate_v4(), g.id, auth.uid(), 'member');
  perform notify_group_members(g.id, 'member_joined', 'A new member joined the group', auth.uid());
  return jsonb_build_object('id', g.id, 'name', g.name);
end;
$$ language plpgsql security definer;

-- regenerate: owner only (as before), new strong code + fresh 7 days.
create or replace function public.regenerate_invite_code(p_group_id uuid)
returns text as $$
declare
  new_code text;
begin
  if get_group_role(p_group_id) <> 'owner' then
    raise exception 'Only the owner can regenerate the invite code';
  end if;
  new_code := public.generate_invite_code();
  update public.groups
  set invite_code = new_code,
      invite_code_expires_at = now() + interval '7 days',
      updated_at = now()
  where id = p_group_id;
  return new_code;
end;
$$ language plpgsql security definer;

-- Preview: RETURN TYPE CHANGES (name + description only -- no owner name,
-- no member count), so the old function must be dropped first.
drop function if exists public.preview_group_by_code(text);
create or replace function public.preview_group_by_code(p_code text)
returns table (group_name text, group_description text) as $$
  select g.name, g.description
  from public.groups g
  where g.invite_code = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'))
    and g.deleted_at is null
    and (g.invite_code_expires_at is null or g.invite_code_expires_at > now());
$$ language sql security definer stable;
grant execute on function public.preview_group_by_code(text) to authenticated;

-- The invite code itself: only the owner / a moderator may read it, via
-- this RPC. Column-level grants below then remove invite_code (and the
-- expiry) from every direct client query, including select *.
create or replace function public.get_group_invite_code(p_group_id uuid)
returns text as $$
  select invite_code from public.groups
  where id = p_group_id
    and get_group_role(p_group_id) in ('owner', 'moderator');
$$ language sql security definer stable;
grant execute on function public.get_group_invite_code(uuid) to authenticated;

revoke select on public.groups from authenticated;
revoke select on public.groups from anon;
grant select (id, owner_id, name, description, subject_id, semester_id,
              avatar_url, created_at, updated_at, deleted_at)
  on public.groups to authenticated;
-- tasks_policy is read/updated by group task settings for members/owners;
-- keep that single column accessible as before.
grant select (tasks_policy), update (tasks_policy) on public.groups to authenticated;

-- =====================================================================
-- ACCEPTANCE TESTS for this migration are in STEP-BY-STEP-GUIDE.md
-- (Fix 1 test: PATCH your own profile with {"role":"admin"} must fail;
--  Fix 7 test: old short codes / member code visibility / throttling.)
-- =====================================================================
