-- 007_resources.sql
create table if not exists resources (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references subjects(id) on delete cascade,
  lecture_id uuid references lectures(id) on delete cascade,
  title text not null,
  url text,
  storage_path text,
  resource_type text not null default 'other', -- pdf|ppt|doc|image|link|other
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_resources_user on resources(user_id);
create index if not exists idx_resources_subject on resources(subject_id);
create index if not exists idx_resources_lecture on resources(lecture_id);
