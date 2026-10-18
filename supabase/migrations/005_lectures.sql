-- 005_lectures.sql
create table if not exists lectures (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  lecture_number int,
  title text not null,
  lecture_date date,
  detailed_notes text,
  short_summary text,
  keywords text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_lectures_user on lectures(user_id);
create index if not exists idx_lectures_subject on lectures(subject_id);
