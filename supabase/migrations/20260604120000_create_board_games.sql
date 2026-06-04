create extension if not exists pgcrypto with schema extensions;

create table if not exists public.board_games (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  release_year integer not null,
  bgg_url text not null,
  created_at timestamptz not null default now(),

  constraint board_games_release_year_check
    check (release_year between 1800 and 2200),
  constraint board_games_bgg_url_check
    check (bgg_url ~ '^https://boardgamegeek\.com/')
);

alter table public.board_games enable row level security;

create policy "Board games are readable by everyone"
  on public.board_games
  for select
  using (true);
