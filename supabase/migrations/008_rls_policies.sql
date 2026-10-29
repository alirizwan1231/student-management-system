-- 008_rls_policies.sql
-- Uniform data-isolation model: every personal table gets ONE policy set,
-- scoped to user_id = auth.uid(). No admin/shared bypass exists.

alter table profiles enable row level security;
drop policy if exists "profiles_own" on profiles;
create policy "profiles_own" on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'semesters', 'subjects', 'lectures', 'tasks', 'resources'
  ])
  loop
    execute format('alter table %I enable row level security;', t);

    execute format('drop policy if exists "%1$s_own" on %1$s;', t);
    execute format(
      'create policy "%1$s_own" on %1$s for all using (user_id = auth.uid()) with check (user_id = auth.uid());',
      t
    );
  end loop;
end$$;
