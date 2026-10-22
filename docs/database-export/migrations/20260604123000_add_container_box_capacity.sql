alter table public.container_box
  add column if not exists capacity integer not null default 8;

alter table public.board_games
  add column if not exists size integer not null default 1;

alter table public.container_box
  add constraint container_box_capacity_check
  check (capacity >= 0);

alter table public.board_games
  add constraint board_games_size_check
  check (size > 0);

create policy "Board games can be moved between boxes"
  on public.board_games
  for update
  using (true)
  with check (true);

create or replace function public.enforce_container_box_capacity()
returns trigger
language plpgsql
as $$
declare
  box_capacity integer;
  box_used_capacity integer;
begin
  if new.box is null then
    return new;
  end if;

  select capacity
  into box_capacity
  from public.container_box
  where id = new.box;

  select coalesce(sum(size), 0)
  into box_used_capacity
  from public.board_games
  where box = new.box
    and id <> new.id;

  if box_used_capacity + new.size > box_capacity then
    raise exception 'Container box % is at capacity', new.box;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_container_box_capacity_trigger on public.board_games;

create trigger enforce_container_box_capacity_trigger
  before insert or update of box on public.board_games
  for each row
  execute function public.enforce_container_box_capacity();
