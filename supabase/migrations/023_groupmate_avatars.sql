-- 023_groupmate_avatars.sql
-- Group members can now be shown with their profile picture (when they set one) next to their
-- name on announcements, shared notes and polls. Names only, never emails. Safe to re-run.

drop function if exists get_groupmate_profiles();

create or replace function get_groupmate_profiles()
returns table(user_id uuid, full_name text, avatar_url text) as $$
  select p.id,
         case
           when p.full_name is null or btrim(p.full_name) = '' or p.full_name like '%@%' then null
           else btrim(p.full_name)
         end,
         p.avatar_url
  from profiles p
  where p.id = auth.uid()
     or exists (
       select 1
       from group_members a
       join group_members b on a.group_id = b.group_id
       where a.user_id = auth.uid() and b.user_id = p.id
     );
$$ language sql security definer stable;
