-- Ownership policies already scope access through libraries.user_id.
-- Keep that lookup indexed after removing the one-library-per-user restriction.
begin;
alter table public.libraries drop constraint if exists libraries_user_id_key;
create index if not exists libraries_user_id_idx on public.libraries (user_id);
commit;
