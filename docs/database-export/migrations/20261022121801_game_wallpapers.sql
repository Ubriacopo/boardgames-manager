-- Page wallpapers are independent of collection cover artwork.
create table public.game_wallpapers (
  bgg_id integer primary key check (bgg_id > 0),
  image_url text not null check (image_url ~ '^https://[^[:space:]]+$'),
  updated_at timestamptz not null default now()
);
alter table public.game_wallpapers enable row level security;
revoke all on public.game_wallpapers from anon, authenticated;
grant select, insert, update on public.game_wallpapers to authenticated;
create policy "Collectors read game wallpapers" on public.game_wallpapers
  for select to authenticated using (true);
create policy "Admins add game wallpapers" on public.game_wallpapers
  for insert to authenticated with check ((select auth.jwt()->'app_metadata'->>'role') = 'admin');
create policy "Admins update game wallpapers" on public.game_wallpapers
  for update to authenticated using ((select auth.jwt()->'app_metadata'->>'role') = 'admin')
  with check ((select auth.jwt()->'app_metadata'->>'role') = 'admin');
-- Artwork files use the existing admin-only game-covers Storage bucket.
