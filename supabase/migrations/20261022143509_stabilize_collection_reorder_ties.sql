-- Use the same name/ID tie-breakers as the collection UI when legacy orders overlap.
create or replace function public.move_collection_game(p_copy_id uuid, p_container_box_id integer, p_index integer default null)
returns void language plpgsql security invoker set search_path='' as $$
declare copy public.board_games_box_association%rowtype; target_ids uuid[]; insertion_index integer;
begin
  select a.* into copy from public.board_games_box_association a join public.libraries l on l.id=a.library_id
    where a.id=p_copy_id and l.user_id=(select auth.uid());
  if not found then raise exception 'This game is not in your library'; end if;
  -- A library lock keeps reorder operations atomic and prevents lock-order races.
  perform 1 from public.libraries where id=copy.library_id for update;
  if p_container_box_id is not null and not exists(select 1 from public.container_box where id=p_container_box_id and library_id=copy.library_id) then
    raise exception 'Choose a cube from your own library';
  end if;
  select coalesce(array_agg(a.id order by a.sort_order, g.name, a.id),'{}'::uuid[]) into target_ids
    from public.board_games_box_association a join public.games g on g.id=a.game_id
    where a.library_id=copy.library_id
    and a.container_box_id is not distinct from p_container_box_id and a.id<>p_copy_id;
  insertion_index := greatest(0,least(coalesce(p_index,cardinality(target_ids)),cardinality(target_ids)));
  update public.board_games_box_association set container_box_id=p_container_box_id, sort_order=insertion_index where id=p_copy_id;
  update public.board_games_box_association a set sort_order=t.position-1+case when t.position>insertion_index then 1 else 0 end
    from unnest(target_ids) with ordinality t(id,position) where a.id=t.id;
end $$;
