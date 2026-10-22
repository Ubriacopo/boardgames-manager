-- Page logos and shelf spines are independent from browsing covers and wallpapers.
create table public.game_logos (
  bgg_id integer primary key check (bgg_id > 0),
  image_url text not null check (image_url ~ '^https://[^[:space:]]+$'),
  updated_at timestamptz not null default now()
);
alter table public.game_logos enable row level security;
revoke all on public.game_logos from anon, authenticated;
grant select, insert, update on public.game_logos to authenticated;
create policy "Collectors read game logos" on public.game_logos
  for select to authenticated using (true);
create policy "Admins add game logos" on public.game_logos
  for insert to authenticated with check ((select auth.jwt()->'app_metadata'->>'role') = 'admin');
create policy "Admins update game logos" on public.game_logos
  for update to authenticated using ((select auth.jwt()->'app_metadata'->>'role') = 'admin')
  with check ((select auth.jwt()->'app_metadata'->>'role') = 'admin');

create table public.game_box_sides (
  bgg_id integer primary key check (bgg_id > 0),
  image_url text not null check (image_url ~ '^https://[^[:space:]]+$'),
  updated_at timestamptz not null default now()
);
alter table public.game_box_sides enable row level security;
revoke all on public.game_box_sides from anon, authenticated;
grant select, insert, update on public.game_box_sides to authenticated;
create policy "Collectors read game box sides" on public.game_box_sides
  for select to authenticated using (true);
create policy "Admins add game box sides" on public.game_box_sides
  for insert to authenticated with check ((select auth.jwt()->'app_metadata'->>'role') = 'admin');
create policy "Admins update game box sides" on public.game_box_sides
  for update to authenticated using ((select auth.jwt()->'app_metadata'->>'role') = 'admin')
  with check ((select auth.jwt()->'app_metadata'->>'role') = 'admin');
-- All four artwork kinds use the existing admin-only Storage upload policy.
