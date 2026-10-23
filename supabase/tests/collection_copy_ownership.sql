-- Run with: supabase db query --linked --file supabase/tests/collection_copy_ownership.sql
-- All fixtures and changes roll back, including on assertion failure.
begin;
do $$
declare owner uuid:=gen_random_uuid(); other_owner uuid:=gen_random_uuid();
  first_library uuid; second_library uuid; foreign_library uuid; definition uuid;
  first_cube integer; second_cube integer; foreign_cube integer;
begin
  insert into auth.users(id) values(owner),(other_owner);
  insert into public.app_users(id) values(owner),(other_owner) on conflict(id) do nothing;
  insert into public.libraries(user_id,name) values(owner,'Ownership test A') returning id into first_library;
  insert into public.libraries(user_id,name) values(owner,'Ownership test B') returning id into second_library;
  insert into public.libraries(user_id,name) values(other_owner,'Ownership test foreign') returning id into foreign_library;
  insert into public.container_box(library_id,label,capacity) values(first_library,'Test',1) returning id into first_cube;
  insert into public.container_box(library_id,label,capacity) values(second_library,'Test',8) returning id into second_cube;
  insert into public.container_box(library_id,label,capacity) values(foreign_library,'Test',8) returning id into foreign_cube;
  insert into public.games(name,bgg_url,release_year) values('Ownership regression fixture','https://boardgamegeek.com/boardgame/test-'||gen_random_uuid(),2026) returning id into definition;
  insert into public.board_games_box_association(user_id,game_id) values(other_owner,definition);
  perform set_config('test.owner',owner::text,true);
  perform set_config('test.other_owner',other_owner::text,true);
  perform set_config('test.first_library',first_library::text,true);
  perform set_config('test.second_library',second_library::text,true);
  perform set_config('test.definition',definition::text,true);
  perform set_config('test.first_cube',first_cube::text,true);
  perform set_config('test.second_cube',second_cube::text,true);
  perform set_config('test.foreign_cube',foreign_cube::text,true);
  perform set_config('request.jwt.claim.sub',owner::text,true);
  perform set_config('request.jwt.claims',json_build_object('sub',owner,'role','authenticated')::text,true);
end $$;
set local role authenticated;
do $$
declare definition uuid:=current_setting('test.definition')::uuid;
  first_copy uuid; second_copy uuid; failed boolean;
begin
  insert into public.board_games_box_association(game_id) values(definition) returning id into first_copy;
  insert into public.board_games_box_association(game_id) values(definition) returning id into second_copy;
  if (select count(*) from public.board_games_box_association where game_id=definition)<>2 then
    raise exception 'Duplicate copies or owner isolation failed'; end if;
  if exists(select 1 from public.board_games_box_association where id=first_copy and (library_id is not null or user_id<>auth.uid())) then
    raise exception 'New copies must be owned and unassigned'; end if;
  perform public.move_collection_game(first_copy,current_setting('test.first_cube')::integer,0);
  if not exists(select 1 from public.board_games_box_association where id=first_copy and library_id=current_setting('test.first_library')::uuid) then
    raise exception 'Placement must assign the cube library'; end if;
  failed:=false;
  begin perform public.move_collection_game(second_copy,current_setting('test.first_cube')::integer,0);
  exception when raise_exception then failed:=true; end;
  if not failed then raise exception 'Capacity check failed'; end if;
  perform public.move_collection_game(first_copy,current_setting('test.second_cube')::integer,0);
  if not exists(select 1 from public.board_games_box_association where id=first_copy and library_id=current_setting('test.second_library')::uuid) then
    raise exception 'Moving between owned libraries failed'; end if;
  perform public.move_collection_game(first_copy,null,0);
  if not exists(select 1 from public.board_games_box_association where id=first_copy and library_id is null and container_box_id is null) then
    raise exception 'Unassignment must clear library membership'; end if;
  failed:=false;
  begin perform public.move_collection_game(first_copy,current_setting('test.foreign_cube')::integer,0);
  exception when raise_exception then failed:=true; end;
  if not failed then raise exception 'Foreign cube placement was allowed'; end if;
  failed:=false;
  begin update public.board_games_box_association set user_id=current_setting('test.other_owner')::uuid where id=first_copy;
  exception when raise_exception or insufficient_privilege then failed:=true; end;
  if not failed then raise exception 'Copy ownership transfer was allowed'; end if;
  perform public.move_collection_game(first_copy,current_setting('test.first_cube')::integer,0);
  delete from public.container_box where id=current_setting('test.first_cube')::integer;
  if not exists(select 1 from public.board_games_box_association where id=first_copy and library_id is null and container_box_id is null) then
    raise exception 'Deleting a cube must preserve and unassign its copies'; end if;
  delete from public.board_games_box_association where id=second_copy;
  insert into public.board_games_box_association(id,game_id) values(second_copy,definition);
  if not exists(select 1 from public.board_games_box_association where id=second_copy and library_id is null) then
    raise exception 'Restoring an unassigned copy failed'; end if;
end $$;
reset role;
insert into public.social_connections(requester_id,recipient_id,kind,status)
  values(current_setting('test.owner')::uuid,current_setting('test.other_owner')::uuid,'friend','accepted');
set local role authenticated;
do $$
declare affected integer; failed boolean:=false;
begin
  if not exists(select 1 from public.board_games_box_association
    where game_id=current_setting('test.definition')::uuid and user_id=current_setting('test.other_owner')::uuid) then
    raise exception 'Friends must retain read access to unassigned copies'; end if;
  update public.board_games_box_association set favorite=true
    where game_id=current_setting('test.definition')::uuid and user_id=current_setting('test.other_owner')::uuid;
  get diagnostics affected = row_count;
  if affected<>0 then raise exception 'Friends must not edit shared copies'; end if;
  begin
    insert into public.board_games_box_association(game_id,user_id)
      values(current_setting('test.definition')::uuid,current_setting('test.other_owner')::uuid);
  exception when insufficient_privilege then failed:=true; end;
  if not failed then raise exception 'Inserting copies for another owner was allowed'; end if;
end $$;
reset role;
rollback;
select 'PASS: duplicate copies, ownership, RLS, placement, capacity, cross-library moves, unassignment, cube deletion, restore, and read-only friend sharing' as result;
