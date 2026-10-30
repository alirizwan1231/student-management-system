-- 029: custom tags for promoted group members.
--
-- Until now every promoted member was simply a "moderator" and the UI
-- labelled them all "Moderator (CR)". The group owner wants to choose the
-- tag at promote time -- CR, GR, or anything else ("Notes Lead", ...).
-- The tag is a display label only: the role stays 'moderator', so every
-- permission rule (staff-only Class Pack publishing etc.) is unchanged.
--
-- 1. A nullable free-text label on the membership row (max 24 chars,
--    enforced in the RPC below).
-- 2. A NEW RPC that also sets the label. The original
--    set_group_member_role (migration 014) is left untouched so older
--    app versions keep working; the new app calls this one and falls
--    back to the old one if this migration has not run yet.

alter table public.group_members
  add column if not exists role_label text;

create or replace function public.set_group_member_role_label(
  p_group_id uuid,
  p_target_user_id uuid,
  p_new_role text,
  p_label text default null
)
returns void as $$
begin
  if public.get_group_role(p_group_id) <> 'owner' then
    raise exception 'Only the owner can change roles';
  end if;
  if p_new_role not in ('moderator', 'member') then
    raise exception 'Invalid role';
  end if;
  update public.group_members
     set role = p_new_role::public.group_role,
         -- a tag only exists while the member is promoted; demoting
         -- clears it. Blank/whitespace means "no custom tag".
         role_label = case
           when p_new_role = 'moderator' then nullif(left(trim(coalesce(p_label, '')), 24), '')
           else null
         end
   where group_id = p_group_id
     and user_id = p_target_user_id
     and role <> 'owner';
end;
$$ language plpgsql security definer;
