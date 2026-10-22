alter table public.board_games
  add column if not exists bgg_id integer;

create policy "Board games can be added"
  on public.board_games
  for insert
  with check (true);
