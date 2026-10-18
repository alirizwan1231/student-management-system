-- 016_group_polls.sql
create table if not exists group_polls (
  id uuid primary key,
  group_id uuid not null references groups(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  question text not null,
  is_closed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create table if not exists group_poll_options (
  id uuid primary key,
  poll_id uuid not null references group_polls(id) on delete cascade,
  option_text text not null,
  position int not null default 0
);
create table if not exists group_poll_votes (
  id uuid primary key,
  poll_id uuid not null references group_polls(id) on delete cascade,
  option_id uuid not null references group_poll_options(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (poll_id, user_id)  -- enforces "one vote per poll" at the DB level
);
create index if not exists idx_polls_group on group_polls(group_id);
create index if not exists idx_poll_options_poll on group_poll_options(poll_id);
create index if not exists idx_poll_votes_poll on group_poll_votes(poll_id);
alter table group_polls enable row level security;
drop policy if exists "polls_select_member" on group_polls;
create policy "polls_select_member" on group_polls for select using (is_group_member(group_id));
drop policy if exists "polls_insert_member" on group_polls;
create policy "polls_insert_member" on group_polls for insert with check (created_by = auth.uid() and is_group_member(group_id));
drop policy if exists "polls_update_creator_or_mod" on group_polls;
create policy "polls_update_creator_or_mod" on group_polls for update using (created_by = auth.uid() or get_group_role(group_id) in ('owner', 'moderator'));
alter table group_poll_options enable row level security;
drop policy if exists "poll_options_select_member" on group_poll_options;
create policy "poll_options_select_member" on group_poll_options for select using (
  exists (select 1 from group_polls p where p.id = poll_id and is_group_member(p.group_id)) );
drop policy if exists "poll_options_insert_creator" on group_poll_options;
create policy "poll_options_insert_creator" on group_poll_options for insert with check (
  exists (select 1 from group_polls p where p.id = poll_id and p.created_by = auth.uid())
);
alter table group_poll_votes enable row level security;
drop policy if exists "poll_votes_select_member" on group_poll_votes;
create policy "poll_votes_select_member" on group_poll_votes for select using (
  exists (select 1 from group_polls p where p.id = poll_id and is_group_member(p.group_id)) );
drop policy if exists "poll_votes_insert_member" on group_poll_votes;
create policy "poll_votes_insert_member" on group_poll_votes for insert with check (
  user_id = auth.uid()
  and exists (select 1 from group_polls p where p.id = poll_id and is_group_member(p.group_id) and p.is_closed = false)
);
