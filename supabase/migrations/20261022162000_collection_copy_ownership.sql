begin;
lock table public.board_games_box_association in access exclusive mode;
drop trigger validate_collection_copy_before_write on public.board_games_box_association;

-- Preserve known owners before removing library membership from unplaced copies.
-- Legacy rows without a known library owner remain inaccessible.
alter table public.board_games_box_association
    add column user_id uuid references auth.users (id) on delete cascade;
update public.board_games_box_association a
set user_id=l.user_id
from public.libraries l
where l.id = a.library_id;
update public.board_games_box_association
set library_id=null
where container_box_id is null;
alter table public.board_games_box_association
    alter column user_id set default auth.uid();
create index association_owner_idx on public.board_games_box_association (user_id);
alter table public.board_games_box_association
    add constraint association_library_placement_check
        check (user_id is null or ((container_box_id is null) = (library_id is null)));
comment on table public.board_games_box_association is 'One owned copy. user_id owns the copy independently of placement; library_id is derived from its cube, or null when unassigned. Legacy ownerless rows stay inaccessible.';

drop policy "Collectors read accessible collections" on public.board_games_box_association;
drop policy "Owners add copies" on public.board_games_box_association;
drop policy "Owners edit copies" on public.board_games_box_association;
drop policy "Owners remove copies" on public.board_games_box_association;
create policy "Collectors read accessible collections" on public.board_games_box_association
    for select to authenticated using (
    user_id = (select auth.uid()) or exists (select 1
                                             from public.libraries l
                                             where l.user_id = board_games_box_association.user_id)
    );
create policy "Owners add copies" on public.board_games_box_association
    for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Owners edit copies" on public.board_games_box_association
    for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Owners remove copies" on public.board_games_box_association
    for delete to authenticated using (user_id = (select auth.uid()));

create or replace function public.validate_collection_copy() returns trigger
    language plpgsql
    security invoker set search_path = '' as
$$
declare
    cube public.container_box%rowtype; used_capacity bigint;
begin
    if tg_op = 'UPDATE' and (new.id is distinct from old.id or new.game_id is distinct from old.game_id or
                             new.user_id is distinct from old.user_id) then
        raise exception 'The identity and owner of a collection copy cannot change';
    end if;
    new.updated_at := now();
    if new.container_box_id is null then
        new.library_id := null;
    else
        select * into cube from public.container_box where id = new.container_box_id for update;
        if not found or
           not exists (select 1 from public.libraries l where l.id = cube.library_id and l.user_id = new.user_id) then
            raise exception 'Choose a cube from your own library';
        end if;
        new.library_id := cube.library_id;
        if tg_op = 'INSERT' or new.container_box_id is distinct from old.container_box_id or
           new.capacity_units is distinct from old.capacity_units then
            select coalesce(sum(capacity_units), 0)
            into used_capacity
            from public.board_games_box_association
            where container_box_id = new.container_box_id
              and id <> new.id;
            if used_capacity + new.capacity_units > coalesce(cube.capacity, 8) then
                raise exception 'This cube is at capacity';
            end if;
        end if;
    end if;
    return new;
end
$$;
create trigger validate_collection_copy_before_write
    before insert or update
    on public.board_games_box_association
    for each row
execute function public.validate_collection_copy();

create or replace function public.move_collection_game(p_copy_id uuid, p_container_box_id integer,
                                                       p_index integer default null)
    returns void
    language plpgsql
    security invoker set search_path = '' as
$$
declare
    copy public.board_games_box_association%rowtype; target_ids uuid[]; insertion_index integer;
begin
    -- One owner lock serializes moves across all shelves and the shared unassigned tray.
    perform 1 from public.app_users where id = (select auth.uid()) for update;
    select *
    into copy
    from public.board_games_box_association
    where id = p_copy_id
      and user_id = (select auth.uid()) for update;
    if not found then raise exception 'This game is not in your collection'; end if;
    if p_container_box_id is not null and not exists (select 1
                                                      from public.container_box c
                                                               join public.libraries l on l.id = c.library_id
                                                      where c.id = p_container_box_id
                                                        and l.user_id = copy.user_id) then
        raise exception 'Choose a cube from your own library';
    end if;
    select coalesce(array_agg(a.id order by a.sort_order,g.name,a.id), '{}'::uuid[])
    into target_ids
    from public.board_games_box_association a
             join public.games g on g.id = a.game_id
    where a.user_id = copy.user_id
      and a.container_box_id is not distinct from p_container_box_id
      and a.id <> p_copy_id;
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
notify pgrst, 'reload schema';
commit;
