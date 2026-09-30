alter table public.board_games
  add column if not exists box_width_mm integer not null default 50,
  add column if not exists box_height_mm integer not null default 200,
  add column if not exists box_depth_mm integer not null default 100,
  add constraint board_games_box_width_mm_check check (box_width_mm > 0),
  add constraint board_games_box_height_mm_check check (box_height_mm > 0),
  add constraint board_games_box_depth_mm_check check (box_depth_mm > 0);

alter table public.container_box
  add column if not exists inner_width_mm integer not null default 330,
  add column if not exists inner_height_mm integer not null default 330,
  add column if not exists inner_depth_mm integer not null default 390,
  add constraint container_box_inner_width_mm_check check (inner_width_mm > 0),
  add constraint container_box_inner_height_mm_check check (inner_height_mm > 0),
  add constraint container_box_inner_depth_mm_check check (inner_depth_mm > 0);

create table public.game_placements (
  game_id uuid primary key references public.board_games (id) on delete cascade,
  container_box_id integer references public.container_box (id) on delete set null,
  orientation text not null default 'vertical'
    check (orientation in ('vertical', 'horizontal')),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index game_placements_container_box_order_idx
  on public.game_placements (container_box_id, sort_order);

insert into public.game_placements (game_id, container_box_id, orientation, sort_order)
select
  id,
  box,
  'vertical',
  row_number() over (partition by box order by name, id) - 1
from public.board_games
where box is not null
on conflict (game_id) do nothing;

create or replace function public.enforce_game_placement_library()
returns trigger
language plpgsql
as $$
declare
  game_library_id uuid;
  box_library_id uuid;
begin
  if new.container_box_id is null then
    return new;
  end if;

  select library_id into game_library_id
  from public.board_games
  where id = new.game_id;

  select library_id into box_library_id
  from public.container_box
  where id = new.container_box_id;

  if game_library_id is null or box_library_id is distinct from game_library_id then
    raise exception 'A game can only be placed in a cube from its own library';
  end if;

  return new;
end;
$$;

create trigger enforce_game_placement_library_trigger
  before insert or update of game_id, container_box_id on public.game_placements
  for each row
  execute function public.enforce_game_placement_library();

create or replace function public.sync_game_box_from_placement()
returns trigger
language plpgsql
as $$
begin
  update public.board_games
  set box = new.container_box_id
  where id = new.game_id;
  return new;
end;
$$;

create trigger sync_game_box_from_placement_trigger
  after insert or update of container_box_id on public.game_placements
  for each row
  execute function public.sync_game_box_from_placement();

alter table public.game_placements enable row level security;
revoke all on table public.game_placements from anon, authenticated;
grant select, insert, update, delete on table public.game_placements to authenticated;

create policy "Users can read placements for games in their library"
  on public.game_placements for select
  to authenticated
  using (
    exists (
      select 1
      from public.board_games
      join public.libraries on libraries.id = board_games.library_id
      where board_games.id = game_placements.game_id
        and libraries.user_id = (select auth.uid())
    )
  );

create policy "Users can create placements for games in their library"
  on public.game_placements for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.board_games
      join public.libraries on libraries.id = board_games.library_id
      where board_games.id = game_placements.game_id
        and libraries.user_id = (select auth.uid())
    )
  );

create policy "Users can update placements for games in their library"
  on public.game_placements for update
  to authenticated
  using (
    exists (
      select 1
      from public.board_games
      join public.libraries on libraries.id = board_games.library_id
      where board_games.id = game_placements.game_id
        and libraries.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.board_games
      join public.libraries on libraries.id = board_games.library_id
      where board_games.id = game_placements.game_id
        and libraries.user_id = (select auth.uid())
    )
  );

create policy "Users can delete placements for games in their library"
  on public.game_placements for delete
  to authenticated
  using (
    exists (
      select 1
      from public.board_games
      join public.libraries on libraries.id = board_games.library_id
      where board_games.id = game_placements.game_id
        and libraries.user_id = (select auth.uid())
    )
  );
