alter table public.board_games
  add column if not exists favorite boolean not null default false;
