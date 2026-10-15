-- 017: public-safe preview of a group by invite code (used by Join Group modal)
create or replace function preview_group_by_code(p_code text)
returns table (group_json jsonb, member_count bigint, owner_name text) as $$
  select
    to_jsonb(g.*) as group_json,
    (select count(*) from group_members where group_id = g.id) as member_count,
    p.full_name as owner_name
  from groups g
  join profiles p on p.id = g.owner_id
  where g.invite_code = upper(p_code) and g.deleted_at is null;
$$ language sql security definer stable;
grant execute on function preview_group_by_code(text) to authenticated;
