-- 009_storage.sql
-- Bucket for lecture/resource/task attachments. Every object path is
-- prefixed with the owner's user id (storage_path = '{user_id}/...'), and
-- policies check that prefix so users can only touch their own files.

insert into storage.buckets (id, name, public)
values ('academic-resources', 'academic-resources', false)
on conflict (id) do nothing;

drop policy if exists "academic_resources_own_select" on storage.objects;
create policy "academic_resources_own_select" on storage.objects
  for select using (
    bucket_id = 'academic-resources'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "academic_resources_own_insert" on storage.objects;
create policy "academic_resources_own_insert" on storage.objects
  for insert with check (
    bucket_id = 'academic-resources'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "academic_resources_own_update" on storage.objects;
create policy "academic_resources_own_update" on storage.objects
  for update using (
    bucket_id = 'academic-resources'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "academic_resources_own_delete" on storage.objects;
create policy "academic_resources_own_delete" on storage.objects
  for delete using (
    bucket_id = 'academic-resources'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
