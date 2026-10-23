-- Transactional fixtures: no users, votes, formats, or copies survive this check.
begin;
do $$
declare owner uuid:=gen_random_uuid(); voter uuid:=gen_random_uuid(); game uuid; other_game uuid; a uuid; b uuid; c uuid;
begin
  insert into auth.users(id) values(owner),(voter);
  insert into public.games(name,bgg_url,release_year)
    values('Default format fixture','https://boardgamegeek.com/boardgame/test-'||gen_random_uuid(),2026) returning id into game;
  insert into public.games(name,bgg_url,release_year)
    values('Other format fixture','https://boardgamegeek.com/boardgame/test-'||gen_random_uuid(),2026) returning id into other_game;
  insert into public.game_box_sizes(game_id,label,width_mm,height_mm,depth_mm,created_at)
    values(game,'Retail',50,200,100,now()-interval '1 day') returning id into a;
  insert into public.game_box_sizes(game_id,label,width_mm,height_mm,depth_mm)
    values(game,'Deluxe',100,250,150) returning id into b;
  insert into public.game_box_sizes(game_id,label,width_mm,height_mm,depth_mm)
    values(other_game,'Other game',50,200,100) returning id into c;
  perform set_config('test.owner',owner::text,true); perform set_config('test.voter',voter::text,true);
  perform set_config('test.game',game::text,true); perform set_config('test.other_game',other_game::text,true);
  perform set_config('test.a',a::text,true); perform set_config('test.b',b::text,true); perform set_config('test.c',c::text,true);
  perform set_config('request.jwt.claim.sub',owner::text,true);
  perform set_config('request.jwt.claims',json_build_object('sub',owner,'role','authenticated')::text,true);
end $$;
set local role authenticated;
do $$
declare game uuid:=current_setting('test.game')::uuid; copy uuid; affected integer; failed boolean:=false;
begin
  if public.default_game_box_size(game) is not null then raise exception 'Do not invent a default without votes or admin choice'; end if;
  copy:=public.add_default_collection_copy(game);
  if not exists(select 1 from public.board_games_box_association where id=copy and game_box_size_id is null and library_id is null and custom_width_mm is null) then
    raise exception 'Quick add without a default must remain unassigned with no fabricated dimensions'; end if;
  insert into public.game_box_size_votes(game_id,size_id) values(game,current_setting('test.b')::uuid);
  if public.default_game_box_size(game)<>current_setting('test.b')::uuid then raise exception 'Vote winner was not selected'; end if;
  copy:=public.add_default_collection_copy(game); perform set_config('test.copy',copy::text,true);
  if not exists(select 1 from public.board_games_box_association where id=copy and game_box_size_id=current_setting('test.b')::uuid) then
    raise exception 'Quick add did not use voted format'; end if;
  update public.games set default_box_size_id=current_setting('test.a')::uuid where id=game;
  get diagnostics affected=row_count;
  if affected<>0 then raise exception 'Non-admin set an explicit default'; end if;
  begin
    insert into public.game_box_size_votes(game_id,size_id,user_id) values(game,current_setting('test.a')::uuid,current_setting('test.voter')::uuid);
  exception when insufficient_privilege then failed:=true; end;
  if not failed then raise exception 'A user voted for another user'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('test.voter'),true),
  set_config('request.jwt.claims',json_build_object('sub',current_setting('test.voter'),'role','authenticated')::text,true);
set local role authenticated;
do $$
declare game uuid:=current_setting('test.game')::uuid; failed boolean:=false;
begin
  insert into public.game_box_size_votes(game_id,size_id) values(game,current_setting('test.a')::uuid);
  if public.default_game_box_size(game)<>current_setting('test.a')::uuid then raise exception 'Ties must resolve to the oldest format'; end if;
  update public.game_box_size_votes set size_id=current_setting('test.b')::uuid where game_id=game;
  if (select count(*) from public.game_box_size_votes where game_id=game and user_id=auth.uid())<>1 then raise exception 'Vote changes must keep a single vote'; end if;
  begin update public.game_box_size_votes set size_id=current_setting('test.c')::uuid where game_id=game and user_id=auth.uid();
  exception when foreign_key_violation then failed:=true; end;
  if not failed then raise exception 'Cross-game format vote was allowed'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('test.owner'),true),
  set_config('request.jwt.claims',json_build_object('sub',current_setting('test.owner'),'role','authenticated','app_metadata',json_build_object('role','admin'))::text,true);
set local role authenticated;
do $$
declare game uuid:=current_setting('test.game')::uuid; copy uuid; failed boolean:=false;
begin
  update public.games set default_box_size_id=current_setting('test.a')::uuid where id=game;
  if public.default_game_box_size(game)<>current_setting('test.a')::uuid then raise exception 'Admin default must override votes'; end if;
  copy:=public.add_default_collection_copy(game);
  if not exists(select 1 from public.board_games_box_association where id=copy and game_box_size_id=current_setting('test.a')::uuid) then raise exception 'Quick add ignored admin format'; end if;
  if not exists(select 1 from public.board_games_box_association where id=current_setting('test.copy')::uuid and game_box_size_id=current_setting('test.b')::uuid) then raise exception 'Existing copies were changed'; end if;
  begin update public.games set default_box_size_id=current_setting('test.c')::uuid where id=game;
  exception when foreign_key_violation then failed:=true; end;
  if not failed then raise exception 'Cross-game admin default was allowed'; end if;
  update public.games set default_box_size_id=null where id=game;
  if public.default_game_box_size(game)<>current_setting('test.b')::uuid then raise exception 'Clearing override must restore community winner'; end if;
end $$;
reset role;
rollback;
select 'PASS: default quick add, fallback, votes, tie resolution, vote isolation, cross-game protection, admin precedence, and existing-copy preservation' as result;
