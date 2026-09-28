-- 003_semesters.sql
create table if not exists semesters (
  id uuid primary key,                 -- client-generated UUID (offline-safe)
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  number int not null,
  start_date date,
  end_date date,
  is_active boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_semesters_user on semesters(user_id);
create index if not exists idx_semesters_user_active on semesters(user_id, is_active);
