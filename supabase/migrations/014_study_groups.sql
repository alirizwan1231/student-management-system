-- 014_study_groups.sql
-- Study Groups: shared workspaces. Personal data stays private by default;
-- a user explicitly shares individual items (snapshotted, not live joins)
-- into a group. All privileged operations (create/join/remove/role-change)
-- go through SECURITY DEFINER functions, same pattern as is_admin()/
-- handle_new_user() already used elsewhere -- RLS stays simple and strict.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'group_role') then
    create type group_role as enum ('owner', 'moderator', 'member');
  end if;
end$$;
create table if not exists groups (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  subject_id uuid references subjects(id) on delete set null,
  semester_id uuid references semesters(id) on delete set null,
  invite_code text not null unique,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create table if not exists group_members (
  id uuid primary key,
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role group_role not null default 'member',
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);
create table if not exists group_shared_items (
  id uuid primary key,
  group_id uuid not null references groups(id) on delete cascade,
  shared_by uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('lecture', 'resource', 'task')),
  source_id uuid not null, -- the sharer's own personal record id (no FK: cross-table, RLS on that table still protects the original)
  snapshot jsonb not null, -- denormalized display copy, independent of the original row's later edits/deletion
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create table if not exists group_announcements (
  id uuid primary key,
  group_id uuid not null references groups(id) on delete cascade,
  posted_by uuid not null references auth.users(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create table if not exists group_comments (
  id uuid primary key,
  group_id uuid not null references groups(id) on delete cascade,
  shared_item_id uuid not null references group_shared_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create table if not exists group_notifications (
  id uuid primary key,
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  message text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists idx_group_members_group on group_members(group_id);
create index if not exists idx_group_members_user on group_members(user_id);
create index if not exists idx_shared_items_group on group_shared_items(group_id);
create index if not exists idx_shared_items_source on group_shared_items(source_type, source_id);
create index if not exists idx_announcements_group on group_announcements(group_id); create index if not exists idx_comments_item on group_comments(shared_item_id);
create index if not exists idx_notifications_user on group_notifications(user_id, read_at);
-- ============== Security-definer helpers (same pattern as is_admin()) ==============
create or replace function is_group_member(gid uuid)
returns boolean as $$
  select exists (select 1 from group_members where group_id = gid and user_id = auth.uid()); $$ language sql security definer stable;
create or replace function get_group_role(gid uuid)
returns text as $$
  select role::text from group_members where group_id = gid and user_id = auth.uid();
$$ language sql security definer stable;
create or replace function notify_group_members(p_group_id uuid, p_type text, p_message text, p_exclude_user uuid default null)
returns void as $$
begin
  insert into group_notifications (id, group_id, user_id, type, message)
  select uuid_generate_v4(), p_group_id, gm.user_id, p_type, p_message
  from group_members gm
  where gm.group_id = p_group_id and (p_exclude_user is null or gm.user_id <> p_exclude_user);
end;
$$ language plpgsql security definer;
-- ============== Privileged operations ==============
create or replace function create_group(p_name text, p_description text, p_subject_id uuid, p_semester_id uuid)
returns groups as $$
declare
  g groups;
  code text;
begin
  code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into groups (id, owner_id, name, description, subject_id, semester_id, invite_code)
  values (uuid_generate_v4(), auth.uid(), p_name, p_description, p_subject_id, p_semester_id, code)
  returning * into g;
  insert into group_members (id, group_id, user_id, role)
  values (uuid_generate_v4(), g.id, auth.uid(), 'owner');
  return g;
end;
$$ language plpgsql security definer;
create or replace function join_group_by_code(p_code text)
returns groups as $$
declare
  g groups;
begin
  select * into g from groups where invite_code = upper(p_code) and deleted_at is null;
  if g.id is null then
    raise exception 'Invalid invite code';
  end if;
  if exists (select 1 from group_members where group_id = g.id and user_id = auth.uid()) then
    raise exception 'You are already a member of this group';
  end if;
  insert into group_members (id, group_id, user_id, role)
  values (uuid_generate_v4(), g.id, auth.uid(), 'member');
  perform notify_group_members(g.id, 'member_joined', 'A new member joined the group', auth.uid());
  return g;
end;
$$ language plpgsql security definer;
create or replace function leave_group(p_group_id uuid)
returns void as $$
begin
  if (select role from group_members where group_id = p_group_id and user_id = auth.uid()) = 'owner' then
    raise exception 'The owner cannot leave. Delete the group instead.';
  end if;
  delete from group_members where group_id = p_group_id and user_id = auth.uid();
end;
$$ language plpgsql security definer;
create or replace function remove_group_member(p_group_id uuid, p_target_user_id uuid) returns void as $$
begin
  if get_group_role(p_group_id) not in ('owner', 'moderator') then
    raise exception 'Not authorized';
  end if;
  if (select role from group_members where group_id = p_group_id and user_id = p_target_user_id) = 'owner' then
    raise exception 'Cannot remove the owner';
  end if;
  perform notify_group_members(p_group_id, 'member_removed', 'A member was removed from the group', null);
  delete from group_members where group_id = p_group_id and user_id = p_target_user_id; end;
$$ language plpgsql security definer;
create or replace function set_group_member_role(p_group_id uuid, p_target_user_id uuid, p_new_role text)
returns void as $$
begin
  if get_group_role(p_group_id) <> 'owner' then
    raise exception 'Only the owner can change roles';
  end if;
  if p_new_role not in ('moderator', 'member') then
    raise exception 'Invalid role';
  end if;
  update group_members set role = p_new_role::group_role
  where group_id = p_group_id and user_id = p_target_user_id and role <> 'owner';
end;
$$ language plpgsql security definer;
create or replace function regenerate_invite_code(p_group_id uuid)
returns text as $$
declare
  new_code text;
begin
  if get_group_role(p_group_id) <> 'owner' then
    raise exception 'Only the owner can regenerate the invite code';
  end if;
  new_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  update groups set invite_code = new_code, updated_at = now() where id = p_group_id;
  return new_code;
end;
$$ language plpgsql security definer;
-- ============== Notification triggers on insert ==============
create or replace function trg_notify_on_share() returns trigger as $$
begin
  perform notify_group_members(new.group_id, 'shared_item', 'New content was shared in the group', new.shared_by);
  return new;
end;
$$ language plpgsql security definer;
drop trigger if exists on_group_shared_item_insert on group_shared_items;
create trigger on_group_shared_item_insert
  after insert on group_shared_items
  for each row execute procedure trg_notify_on_share();
create or replace function trg_notify_on_announcement() returns trigger as $$
begin
  perform notify_group_members(new.group_id, 'announcement', 'New announcement posted', new.posted_by);
  return new;
end;
$$ language plpgsql security definer;
drop trigger if exists on_group_announcement_insert on group_announcements;
create trigger on_group_announcement_insert
  after insert on group_announcements
  for each row execute procedure trg_notify_on_announcement();
create or replace function trg_notify_on_comment() returns trigger as $$
begin
  perform notify_group_members(new.group_id, 'comment', 'New comment on shared content', new.user_id);
  return new;
end;
$$ language plpgsql security definer;
drop trigger if exists on_group_comment_insert on group_comments;
create trigger on_group_comment_insert
  after insert on group_comments
  for each row execute procedure trg_notify_on_comment();
-- ============== RLS ==============
alter table groups enable row level security;
drop policy if exists "groups_select_member" on groups;
create policy "groups_select_member" on groups for select using (is_group_member(id)); drop policy if exists "groups_update_owner" on groups;
create policy "groups_update_owner" on groups for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
-- No direct INSERT policy: groups are created only via create_group() (SECURITY DEFINER).
alter table group_members enable row level security;
drop policy if exists "group_members_select_member" on group_members;
create policy "group_members_select_member" on group_members for select using (is_group_member(group_id));
-- No direct INSERT/UPDATE/DELETE policy: all membership changes go through
-- join_group_by_code() / leave_group() / remove_group_member() / set_group_member_role().
alter table group_shared_items enable row level security;
drop policy if exists "shared_items_select_member" on group_shared_items;
create policy "shared_items_select_member" on group_shared_items for select using (is_group_member(group_id));
drop policy if exists "shared_items_insert_owner" on group_shared_items;
create policy "shared_items_insert_owner" on group_shared_items
  for insert with check (shared_by = auth.uid() and is_group_member(group_id));
drop policy if exists "shared_items_delete_owner_or_mod" on group_shared_items;
create policy "shared_items_delete_owner_or_mod" on group_shared_items
  for update using (shared_by = auth.uid() or get_group_role(group_id) in ('owner', 'moderator'));
alter table group_announcements enable row level security;
drop policy if exists "announcements_select_member" on group_announcements;
create policy "announcements_select_member" on group_announcements for select using (is_group_member(group_id));
drop policy if exists "announcements_insert_mod" on group_announcements;
create policy "announcements_insert_mod" on group_announcements
  for insert with check (posted_by = auth.uid() and get_group_role(group_id) in ('owner', 'moderator'));
drop policy if exists "announcements_delete_mod" on group_announcements;
create policy "announcements_delete_mod" on group_announcements
  for update using (get_group_role(group_id) in ('owner', 'moderator'));
alter table group_comments enable row level security;
drop policy if exists "comments_select_member" on group_comments;
create policy "comments_select_member" on group_comments for select using (is_group_member(group_id));
drop policy if exists "comments_insert_member" on group_comments;
create policy "comments_insert_member" on group_comments
  for insert with check (user_id = auth.uid() and is_group_member(group_id));
drop policy if exists "comments_delete_own_or_mod" on group_comments;
create policy "comments_delete_own_or_mod" on group_comments
  for update using (user_id = auth.uid() or get_group_role(group_id) in ('owner', 'moderator')); alter table group_notifications enable row level security;
drop policy if exists "notifications_own" on group_notifications;
create policy "notifications_own" on group_notifications
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
