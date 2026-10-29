-- 026_class_pack_publish.sql
-- The publish function (owner/moderator only). Packs may be up to 1.5 MB of JSON.
create or replace function publish_class_pack(p_group_id uuid, p_title text, p_payload jsonb)
returns integer as $$
declare v integer;
begin
  if not is_group_staff(p_group_id) then
    raise exception 'Only the owner or moderators can publish a class pack';
  end if;
  if jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Invalid class pack';
  end if;
  if octet_length(p_payload::text) > 1500000 then
    raise exception 'The class pack is too large';
  end if;

  insert into class_packs (group_id, version, published_by, title, payload)
  values (p_group_id, 1, auth.uid(), left(p_title, 120), p_payload)
  on conflict (group_id) do update
    set version = class_packs.version + 1,
        published_by = auth.uid(),
        title = excluded.title,
        payload = excluded.payload,
        published_at = now()
  returning version into v;

  insert into group_notifications (id, group_id, user_id, type, message)
  select uuid_generate_v4(), p_group_id, gm.user_id, 'class_pack',
         case when v = 1 then 'Class pack published: ' else 'Class pack updated: ' end || left(p_title, 80)
  from group_members gm
  where gm.group_id = p_group_id and gm.user_id <> auth.uid();

  return v;
end;
$$ language plpgsql security definer;
