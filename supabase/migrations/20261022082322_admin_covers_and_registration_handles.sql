-- Handles are case-normalized before the unique constraint is checked.
alter table public.social_profiles drop constraint social_profiles_handle_check;
update public.social_profiles set handle = 'player.' || replace(id::text, '-', '')
where handle !~ '^[a-z0-9.]{3,40}$';
alter table public.social_profiles add constraint social_profiles_handle_check
  check (handle ~ '^[a-z0-9.]{3,40}$');
create function public.normalize_social_handle() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  new.handle := lower(btrim(new.handle));
  return new;
end;
$$;
revoke all on function public.normalize_social_handle() from public, anon, authenticated;
create trigger normalize_social_handle_before_write before insert or update of handle
on public.social_profiles for each row execute function public.normalize_social_handle();

create or replace function public.create_social_profile()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  insert into public.social_profiles(id, handle, display_name)
  values (new.id, 'player.' || replace(new.id::text, '-', ''), 'Board game collector');
  return new;
end;
$$;
-- Registration can check only public handles; account IDs and other fields stay private.
grant select(handle) on public.social_profiles to anon;
create policy "Visitors can check public handle availability" on public.social_profiles
  for select to anon using (true);

-- Provision the requested handle within the Auth signup transaction. A duplicate
-- handle rolls the entire registration back, including when email confirmation is enabled.
create schema if not exists private;
create function private.register_collector() returns trigger
language plpgsql security definer set search_path = '' as $$
declare requested_handle text;
begin
  requested_handle := lower(btrim(new.raw_user_meta_data ->> 'handle'));
  if requested_handle is not null and requested_handle !~ '^[a-z0-9.]{3,40}$' then
    raise exception 'Handle must contain 3–40 lowercase letters, numbers, or dots';
  end if;
  insert into public.app_users(id, email) values (new.id, new.email);
  if requested_handle is not null then
    update public.social_profiles set handle = requested_handle, display_name = requested_handle where id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function private.register_collector() from public, anon, authenticated, service_role;
create trigger register_collector_after_signup after insert on auth.users
for each row execute function private.register_collector();

-- Admin authority comes exclusively from server-controlled app_metadata.
create table public.game_covers (
  bgg_id integer primary key check (bgg_id > 0),
  image_url text not null check (image_url ~ '^https://[^[:space:]]+$'),
  updated_at timestamptz not null default now()
);
alter table public.game_covers enable row level security;
revoke all on public.game_covers from anon, authenticated;
grant select, insert, update on public.game_covers to authenticated;
create policy "Collectors read shared game covers" on public.game_covers
  for select to authenticated using (true);
create policy "Admins add shared game covers" on public.game_covers
  for insert to authenticated with check ((select auth.jwt()->'app_metadata'->>'role') = 'admin');
create policy "Admins update shared game covers" on public.game_covers
  for update to authenticated using ((select auth.jwt()->'app_metadata'->>'role') = 'admin')
  with check ((select auth.jwt()->'app_metadata'->>'role') = 'admin');

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('game-covers', 'game-covers', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy "Admins upload game covers" on storage.objects
  for insert to authenticated with check (bucket_id = 'game-covers' and (select auth.jwt()->'app_metadata'->>'role') = 'admin');
-- Uploads use new immutable paths, so overwrites are unnecessary.

create extension if not exists pg_trgm with schema extensions;
create index social_profiles_handle_trgm_idx on public.social_profiles using gin(handle extensions.gin_trgm_ops);
create function public.search_collectors(query text)
returns setof public.social_profiles language sql stable security invoker set search_path = '' as $$
  select p.* from public.social_profiles p
  where p.id <> (select auth.uid()) and char_length(btrim(query)) between 2 and 40
    and (p.handle ilike '%' || replace(replace(btrim(query), '%', '\%'), '_', '\_') || '%'
      or extensions.similarity(p.handle, lower(btrim(query))) >= 0.2
      or extensions.word_similarity(lower(btrim(query)), lower(p.display_name)) >= 0.4)
  order by (p.handle = lower(btrim(query))) desc,
    greatest(extensions.similarity(p.handle, lower(btrim(query))), extensions.word_similarity(lower(btrim(query)), lower(p.display_name))) desc,
    p.handle limit 30;
$$;
revoke all on function public.search_collectors(text) from public, anon;
grant execute on function public.search_collectors(text) to authenticated;
