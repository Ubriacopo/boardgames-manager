begin;

lock table public.board_games, public.game_placements in access exclusive mode;

-- Keep an exact, inaccessible snapshot before splitting definitions from copies.
-- Existing UUIDs stay on owned copies, preserving rating/session references.
create schema if not exists migration_archive;
revoke all on schema migration_archive from public, anon, authenticated, service_role;
create table migration_archive.board_games_before_catalog as table public.board_games;
alter table migration_archive.board_games_before_catalog
    enable row level security;
revoke all on migration_archive.board_games_before_catalog from public, anon, authenticated, service_role;

create table public.games
(
    id           uuid primary key     default gen_random_uuid(),
    bgg_id       integer unique check (bgg_id > 0),
    bgg_url      text        not null unique check (bgg_url ~ '^https://boardgamegeek\.com/'),
    name         text        not null check (char_length(btrim(name)) between 1 and 300),
    release_year integer     not null check (release_year between 1800 and 2200),
    image_url    text,
    created_by   uuid                 default auth.uid() references auth.users (id) on delete set null,
    created_at   timestamptz not null default now()
);
create index games_created_by_idx on public.games (created_by);
comment on table public.games is 'Shared game definitions. Contains no ownership, shelf placement, or physical copy dimensions.';

-- One definition per BGG game, including older rows whose BGG ID only exists in the URL.
with normalized as (select *, coalesce(bgg_id, substring(bgg_url from '/boardgame/([0-9]+)')::integer) as catalog_bgg_id
                    from public.board_games),
     chosen as (select distinct on (coalesce(catalog_bgg_id::text, bgg_url)) *
                from normalized
                order by coalesce(catalog_bgg_id::text, bgg_url), (image_url is not null) desc, created_at desc, id)
insert
into public.games(bgg_id, bgg_url, name, release_year, image_url, created_by, created_at)
select catalog_bgg_id,
       case when catalog_bgg_id is null then bgg_url else 'https://boardgamegeek.com/boardgame/' || catalog_bgg_id end,
       name,
       release_year,
       image_url,
       null,
       created_at
from chosen;

create table public.game_box_sizes
(
    id         uuid primary key     default gen_random_uuid(),
    game_id    uuid        not null references public.games (id) on delete cascade,
    label      text        not null check (char_length(btrim(label)) between 1 and 120),
    country    text        not null default '' check (char_length(country) <= 80),
    width_mm   integer     not null check (width_mm between 1 and 2000),
    height_mm  integer     not null check (height_mm between 1 and 2000),
    depth_mm   integer     not null check (depth_mm between 1 and 2000),
    created_by uuid                 default auth.uid() references auth.users (id) on delete set null,
    created_at timestamptz not null default now(),
    unique (id, game_id),
    unique (game_id, label, country, width_mm, height_mm, depth_mm)
);
create index game_box_sizes_created_by_idx on public.game_box_sizes (created_by);
comment on table public.game_box_sizes is 'Reusable edition/country box-size variants in millimetres. Published sizes are immutable; add another variant to correct one.';

-- Remove the old write/sync paths before consolidating placement into the copy.
drop trigger if exists enforce_container_box_capacity_trigger on public.board_games;
drop trigger if exists enforce_game_placement_library_trigger on public.game_placements;
drop trigger if exists sync_game_box_from_placement_trigger on public.game_placements;
drop function if exists public.enforce_container_box_capacity();
drop function if exists public.enforce_game_placement_library();
drop function if exists public.sync_game_box_from_placement();

alter table public.board_games
    rename to board_games_box_association;
alter table public.board_games_box_association
    add column game_id          uuid references public.games (id),
    add column game_box_size_id uuid,
    add column sort_order       integer     not null default 0 check (sort_order >= 0),
    add constraint association_capacity_units_positive check (size > 0),
    add column updated_at       timestamptz not null default now();
update public.board_games_box_association a
set game_id=g.id
from public.games g
where coalesce(a.bgg_id, substring(a.bgg_url from '/boardgame/([0-9]+)')::integer) = g.bgg_id
   or (g.bgg_id is null and g.bgg_url = a.bgg_url);
alter table public.board_games_box_association
    alter column game_id set not null;
update public.board_games_box_association a
set box=p.container_box_id,
    sort_order=p.sort_order,
    updated_at=p.updated_at
from public.game_placements p
where p.game_id = a.id;

-- Archive the original placement rows, retaining all original values for recovery.
alter table public.game_placements
    set schema migration_archive;
-- Snapshots must not change when live copies or cubes are later removed.
alter table migration_archive.game_placements
    drop constraint game_placements_game_id_fkey,
    drop constraint game_placements_container_box_id_fkey;
revoke all on migration_archive.game_placements from public, anon, authenticated, service_role;

alter table public.board_games_box_association
    rename column box to container_box_id;
alter table public.board_games_box_association
    rename column size to capacity_units;
alter table public.board_games_box_association
    rename column box_width_mm to custom_width_mm;
alter table public.board_games_box_association
    rename column box_height_mm to custom_height_mm;
alter table public.board_games_box_association
    rename column box_depth_mm to custom_depth_mm;
alter table public.board_games_box_association
    alter column custom_width_mm drop not null,
    alter column custom_width_mm drop default,
    alter column custom_height_mm drop not null,
    alter column custom_height_mm drop default,
    alter column custom_depth_mm drop not null,
    alter column custom_depth_mm drop default,
    add constraint association_custom_dimensions_check check (
        (custom_width_mm is null and custom_height_mm is null and custom_depth_mm is null)
            or (custom_width_mm is not null and custom_height_mm is not null and custom_depth_mm is not null
            and custom_width_mm between 1 and 2000 and custom_height_mm between 1 and 2000 and
                custom_depth_mm between 1 and 2000)
        ),
    add constraint association_size_game_fkey foreign key (game_box_size_id, game_id)
        references public.game_box_sizes (id, game_id),
    drop column bgg_id,
    drop column bgg_url,
    drop column name,
    drop column release_year,
    drop column image_url;
alter table public.board_games_box_association
    drop constraint board_games_box_fkey;
alter table public.board_games_box_association
    add constraint board_games_box_fkey
        foreign key (container_box_id) references public.container_box (id) on delete set null;
create index association_game_id_idx on public.board_games_box_association (game_id);
create index association_size_game_idx on public.board_games_box_association (game_box_size_id, game_id);
create index association_cube_order_idx on public.board_games_box_association (container_box_id, sort_order);
comment on table public.board_games_box_association is 'One owned copy: library, optional Kallax cube, selected size variant, optional custom dimensions, favorite, capacity units, and display order. Legacy ownerless rows stay inaccessible.';

-- Replace every old policy, including permissive policies from early schemas.
do
$$
    declare
        p record;
    begin
        for p in select policyname
                 from pg_policies
                 where schemaname = 'public'
                   and tablename = 'board_games_box_association'
            loop
                execute format('drop policy %I on public.board_games_box_association', p.policyname);
            end loop;
    end
$$;
alter table public.games
    enable row level security;
alter table public.game_box_sizes
    enable row level security;
alter table public.board_games_box_association
    enable row level security;
revoke all on public.games, public.game_box_sizes, public.board_games_box_association from public, anon, authenticated;
grant select, insert on public.games, public.game_box_sizes to authenticated;
grant update on public.games to authenticated;
grant select, insert, update, delete on public.board_games_box_association to authenticated;
create policy "Collectors read definitions" on public.games for select to authenticated using (true);
create policy "Collectors add definitions" on public.games for insert to authenticated with check (created_by = (select auth.uid()));
create policy "Admins edit definitions" on public.games for update to authenticated
    using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
    with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "Collectors read size variants" on public.game_box_sizes for select to authenticated using (true);
create policy "Collectors publish size variants" on public.game_box_sizes for insert to authenticated with check (created_by = (select auth.uid()));
create policy "Collectors read accessible collections" on public.board_games_box_association for select to authenticated
    using (exists(select 1
                  from public.libraries l
                  where l.id = library_id));
create policy "Owners add copies" on public.board_games_box_association for insert to authenticated
    with check (exists(select 1
                       from public.libraries l
                       where l.id = library_id
                         and l.user_id = (select auth.uid())));
create policy "Owners edit copies" on public.board_games_box_association for update to authenticated
    using (exists(select 1
                  from public.libraries l
                  where l.id = library_id
                    and l.user_id = (select auth.uid())))
    with check (exists(select 1
                       from public.libraries l
                       where l.id = library_id
                         and l.user_id = (select auth.uid())));
create policy "Owners remove copies" on public.board_games_box_association for delete to authenticated
    using (exists(select 1
                  from public.libraries l
                  where l.id = library_id
                    and l.user_id = (select auth.uid())));

create function public.validate_collection_copy() returns trigger
    language plpgsql
    security invoker set search_path = '' as
$$
declare
    cube public.container_box%rowtype; used_capacity bigint;
begin
    if tg_op = 'UPDATE' and (new.id is distinct from old.id or new.game_id is distinct from old.game_id or
                             new.library_id is distinct from old.library_id) then
        raise exception 'The identity and owner of a collection copy cannot change';
    end if;
    new.updated_at := now();
    if new.container_box_id is not null and
       (tg_op = 'INSERT' or new.container_box_id is distinct from old.container_box_id or
        new.capacity_units is distinct from old.capacity_units) then
        -- Serialize inserts/moves into a cube, including concurrent requests.
        select * into cube from public.container_box where id = new.container_box_id for update;
        if not found or cube.library_id is distinct from new.library_id then
            raise exception 'Choose a cube from your own library';
        end if;
        select coalesce(sum(capacity_units), 0)
        into used_capacity
        from public.board_games_box_association
        where container_box_id = new.container_box_id
          and id <> new.id;
        if used_capacity + new.capacity_units > coalesce(cube.capacity, 8) then
            raise exception 'This cube is at capacity';
        end if;
    end if;
    return new;
end
$$;
revoke all on function public.validate_collection_copy() from public, anon, authenticated;
create trigger validate_collection_copy_before_write
    before insert or update
    on public.board_games_box_association
    for each row
execute function public.validate_collection_copy();

create function public.move_collection_game(p_copy_id uuid, p_container_box_id integer, p_index integer default null)
    returns void
    language plpgsql
    security invoker set search_path = '' as
$$
declare
    copy public.board_games_box_association%rowtype; target_ids uuid[]; insertion_index integer;
begin
    select a.*
    into copy
    from public.board_games_box_association a
             join public.libraries l on l.id = a.library_id
    where a.id = p_copy_id
      and l.user_id = (select auth.uid());
    if not found then raise exception 'This game is not in your library'; end if;
    -- A library lock keeps reorder operations atomic and prevents lock-order races.
    perform 1 from public.libraries where id = copy.library_id for update;
    if p_container_box_id is not null and not exists(select 1
                                                     from public.container_box
                                                     where id = p_container_box_id
                                                       and library_id = copy.library_id) then
        raise exception 'Choose a cube from your own library';
    end if;
    select coalesce(array_agg(id order by sort_order, created_at, id), '{}'::uuid[])
    into target_ids
    from public.board_games_box_association
    where library_id = copy.library_id
      and container_box_id is not distinct from p_container_box_id
      and id <> p_copy_id;
    insertion_index := greatest(0, least(coalesce(p_index, cardinality(target_ids)), cardinality(target_ids)));
    update public.board_games_box_association
    set container_box_id=p_container_box_id,
        sort_order=insertion_index
    where id = p_copy_id;
    update public.board_games_box_association a
    set sort_order=t.position - 1 + case when t.position > insertion_index then 1 else 0 end
    from unnest(target_ids) with ordinality t(id, position)
    where a.id = t.id;
end
$$;
revoke all on function public.move_collection_game(uuid,integer,integer) from public, anon;
grant execute on function public.move_collection_game(uuid,integer,integer) to authenticated;
notify pgrst, 'reload schema';

commit;
