create table if not exists public.app_users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists public.libraries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.app_users (id) on delete cascade,
  name text not null default 'My library',
  created_at timestamptz not null default now()
);

alter table public.container_box
  add column if not exists library_id uuid references public.libraries (id) on delete cascade;

alter table public.board_games
  add column if not exists library_id uuid references public.libraries (id) on delete cascade;

alter table public.container_box
  add constraint container_box_library_label_key unique (library_id, label);

alter table public.app_users enable row level security;
alter table public.libraries enable row level security;
alter table public.container_box enable row level security;
alter table public.board_games enable row level security;

drop policy if exists "Board games are readable by everyone" on public.board_games;
drop policy if exists "Board games can be moved between boxes" on public.board_games;
drop policy if exists "Board games can be added" on public.board_games;
drop policy if exists "Board games can be sold" on public.board_games;
drop policy if exists "Container boxes are readable by everyone" on public.container_box;

create policy "Users can read their own app profile"
  on public.app_users
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can create their own app profile"
  on public.app_users
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "Users can update their own app profile"
  on public.app_users
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Users can read their own library"
  on public.libraries
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own library"
  on public.libraries
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own library"
  on public.libraries
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own library"
  on public.libraries
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can read boxes in their library"
  on public.container_box
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.libraries
      where libraries.id = container_box.library_id
        and libraries.user_id = (select auth.uid())
    )
  );

create policy "Users can create boxes in their library"
  on public.container_box
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.libraries
      where libraries.id = container_box.library_id
        and libraries.user_id = (select auth.uid())
    )
  );

create policy "Users can update boxes in their library"
  on public.container_box
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.libraries
      where libraries.id = container_box.library_id
        and libraries.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.libraries
      where libraries.id = container_box.library_id
        and libraries.user_id = (select auth.uid())
    )
  );

create policy "Users can delete boxes in their library"
  on public.container_box
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.libraries
      where libraries.id = container_box.library_id
        and libraries.user_id = (select auth.uid())
    )
  );

create policy "Users can read games in their library"
  on public.board_games
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.libraries
      where libraries.id = board_games.library_id
        and libraries.user_id = (select auth.uid())
    )
  );

create policy "Users can create games in their library"
  on public.board_games
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.libraries
      where libraries.id = board_games.library_id
        and libraries.user_id = (select auth.uid())
    )
  );

create policy "Users can update games in their library"
  on public.board_games
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.libraries
      where libraries.id = board_games.library_id
        and libraries.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.libraries
      where libraries.id = board_games.library_id
        and libraries.user_id = (select auth.uid())
    )
  );

create policy "Users can delete games in their library"
  on public.board_games
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.libraries
      where libraries.id = board_games.library_id
        and libraries.user_id = (select auth.uid())
    )
  );

create or replace function public.enforce_container_box_capacity()
returns trigger
language plpgsql
as $$
declare
  box_capacity integer;
  box_library_id uuid;
  box_used_capacity integer;
begin
  if new.box is null then
    return new;
  end if;

  select capacity, library_id
  into box_capacity, box_library_id
  from public.container_box
  where id = new.box;

  if box_library_id is distinct from new.library_id then
    raise exception 'Container box % does not belong to this library', new.box;
  end if;

  select coalesce(sum(size), 0)
  into box_used_capacity
  from public.board_games
  where box = new.box
    and library_id = new.library_id
    and id <> new.id;

  if box_used_capacity + new.size > box_capacity then
    raise exception 'Container box % is at capacity', new.box;
  end if;

  return new;
end;
$$;
