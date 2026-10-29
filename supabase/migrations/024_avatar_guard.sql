-- 024_avatar_guard.sql
-- Profile pictures are stored as small inline images (data:image/...). Refuse anything else or
-- anything huge. NOT VALID = only checks new and changed rows. Safe to re-run.
alter table profiles drop constraint if exists profiles_avatar_url_check;
alter table profiles add constraint profiles_avatar_url_check
  check (avatar_url is null or (avatar_url like 'data:image/%' and length(avatar_url) <= 80000)) not valid;
