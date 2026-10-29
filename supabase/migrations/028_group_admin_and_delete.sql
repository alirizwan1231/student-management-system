-- 028_group_admin_and_delete.sql
-- =====================================================================
-- Group ownership fixes requested by the owner of the app (2026-10-29):
--  1. A "Delete group" action (owner only). Until now the app had
--     leave_group() -- which tells the owner to "delete the group
--     instead" -- but no delete function existed anywhere.
--  2. The group creator must always be the owner ("Admin"). Some
--     membership rows in the live database carry role <> 'owner' for the
--     group's creator, so the creator appeared as a plain member and
--     lost staff powers (including class pack publishing). Repair the
--     rows and add a trigger so the invariant can never break again.
--  3. Class pack publishing stays staff-only (the group Admin or a
--     promoted moderator/CR). publish_class_pack is restated unchanged
--     so the whole rule lives in one migration; ordinary members can
--     only IMPORT a published pack, which happens in their own account
--     and writes nothing to the group.
-- Safe to run ONCE in the Supabase SQL Editor; statements are idempotent.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. delete_group: owner-only SOFT delete (deleted_at). The client
--    filters soft-deleted groups out of every list and treats their
--    pages as gone; the row (and its history) remains in the database.
-- ---------------------------------------------------------------------
create or replace function public.delete_group(p_group_id uuid)
returns void as $$
begin
  if public.get_group_role(p_group_id) <> 'owner' then
    raise exception 'Only the group owner can delete the group';
  end if;

  insert into public.group_notifications (id, group_id, user_id, type, message)
  select uuid_generate_v4(), p_group_id, gm.user_id, 'group_deleted',
         'A group you were in was deleted by its owner'
  from public.group_members gm
  where gm.group_id = p_group_id and gm.user_id <> auth.uid();

  update public.groups
  set deleted_at = now(), updated_at = now()
  where id = p_group_id and deleted_at is null;
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------------------
-- 2A. Repair: every group's creator gets an 'owner' membership row.
-- ---------------------------------------------------------------------
insert into public.group_members (id, group_id, user_id, role)
select uuid_generate_v4(), g.id, g.owner_id, 'owner'
from public.groups g
where not exists (
  select 1 from public.group_members gm
  where gm.group_id = g.id and gm.user_id = g.owner_id
);

update public.group_members gm
set role = 'owner'
from public.groups g
where gm.group_id = g.id
  and gm.user_id = g.owner_id
  and gm.role <> 'owner';

-- ---------------------------------------------------------------------
-- 2B. Guarantee: a trigger that forces role='owner' on the creator's
--     membership row, whatever any current or future code path writes.
-- ---------------------------------------------------------------------
create or replace function public.enforce_group_owner_role()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1 from public.groups g
    where g.id = new.group_id and g.owner_id = new.user_id
  ) then
    new.role := 'owner';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_group_owner_role on public.group_members;
create trigger trg_enforce_group_owner_role
  before insert or update of role, user_id, group_id on public.group_members
  for each row execute function public.enforce_group_owner_role();

-- ---------------------------------------------------------------------
-- 3. Class pack publish: staff only (restated from migration 026,
--    unchanged). Ordinary members get no write path to class_packs:
--    the table's only policy is SELECT for members (migration 025).
-- ---------------------------------------------------------------------
create or replace function public.publish_class_pack(p_group_id uuid, p_title text, p_payload jsonb)
returns integer as $$
declare v integer;
begin
  if not public.is_group_staff(p_group_id) then
    raise exception 'Only the owner or moderators can publish a class pack';
  end if;
  if jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Invalid class pack';
  end if;
  if octet_length(p_payload::text) > 1500000 then
    raise exception 'The class pack is too large';
  end if;

  insert into public.class_packs (group_id, version, published_by, title, payload)
  values (p_group_id, 1, auth.uid(), left(p_title, 120), p_payload)
  on conflict (group_id) do update
    set version = class_packs.version + 1,
        published_by = auth.uid(),
        title = excluded.title,
        payload = excluded.payload,
        published_at = now()
  returning version into v;

  insert into public.group_notifications (id, group_id, user_id, type, message)
  select uuid_generate_v4(), p_group_id, gm.user_id, 'class_pack',
         case when v = 1 then 'Class pack published: ' else 'Class pack updated: ' end || left(p_title, 80)
  from public.group_members gm
  where gm.group_id = p_group_id and gm.user_id <> auth.uid();

  return v;
end;
$$ language plpgsql security definer;

-- =====================================================================
-- VERIFY after running (read-only):
--   select count(*) from group_members gm join groups g on g.id = gm.group_id
--     where gm.user_id = g.owner_id and gm.role <> 'owner';   -- expect 0
-- =====================================================================
