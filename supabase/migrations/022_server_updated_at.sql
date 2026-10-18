-- 022_server_updated_at.sql
-- Cross-device sync fix: every synced table now gets its "updated_at" stamped by the
-- DATABASE clock on every insert/update, instead of trusting each phone's/laptop's clock.
-- With device clocks that differ by even a few minutes, a change made on one device could
-- carry an older timestamp than what another device had already synced, and was never
-- downloaded. Safe to re-run; tables that do not exist yet are skipped.

create or replace function set_server_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare t text;
begin
  foreach t in array array[
    'semesters', 'subjects', 'lectures', 'tasks', 'resources', 'lecturers',
    'timetable_slots', 'timetable_exceptions', 'attendance_records', 'exams', 'grade_entries'
  ]
  loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists trg_server_updated_at on %I', t);
      execute format(
        'create trigger trg_server_updated_at before insert or update on %I for each row execute procedure set_server_updated_at()', t
      );
    end if;
  end loop;
end $$;
