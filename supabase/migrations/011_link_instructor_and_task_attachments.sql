-- 011_link_instructor_and_task_attachments.sql
-- Links subjects to a real instructor row, and lets a resource (attachment)
-- belong directly to a task -- both additive, nothing existing is touched.
-- Row Level Security already in place on subjects/resources (see
-- 008_rls_policies.sql) covers these new columns too; no new policy needed.

alter table subjects
  add column if not exists lecturer_id uuid references lecturers(id) on delete set null;

create index if not exists idx_subjects_lecturer on subjects(lecturer_id);

alter table resources
  add column if not exists task_id uuid references tasks(id) on delete cascade;

create index if not exists idx_resources_task on resources(task_id);
