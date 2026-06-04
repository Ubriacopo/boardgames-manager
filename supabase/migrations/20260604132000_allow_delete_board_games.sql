create policy "Board games can be sold"
  on public.board_games
  for delete
  using (true);
