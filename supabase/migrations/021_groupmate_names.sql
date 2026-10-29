-- 021_groupmate_names.sql
-- Lets people in the same study group see each other's NAMES (never emails).
-- The profiles table stays private (own row only); this function exposes just
-- the display name of people you share a group with. Safe to re-run.

create or replace function get_groupmate_profiles()
returns table(user_id uuid, full_name text) as $$
  select p.id,
         case
           when p.full_name is null or btrim(p.full_name) = '' or p.full_name like '%@%' then null
           else btrim(p.full_name)
         end
  from profiles p
  where p.id = auth.uid()
     or exists (
       select 1
       from group_members a
       join group_members b on a.group_id = b.group_id
       where a.user_id = auth.uid() and b.user_id = p.id
     );
$$ language sql security definer stable;
