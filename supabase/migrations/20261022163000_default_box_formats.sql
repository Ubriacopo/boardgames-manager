begin;
alter table public.games add column default_box_size_id uuid,
  add constraint games_default_box_size_fkey foreign key(default_box_size_id,id)
    references public.game_box_sizes(id,game_id);
create index games_default_box_size_idx on public.games(default_box_size_id,id) where default_box_size_id is not null;

create table public.game_box_size_votes (
  game_id uuid not null references public.games(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  size_id uuid not null,
  primary key(game_id,user_id),
  foreign key(size_id,game_id) references public.game_box_sizes(id,game_id) on delete cascade
);
create index game_box_size_votes_size_idx on public.game_box_size_votes(size_id,game_id);
create index game_box_size_votes_user_idx on public.game_box_size_votes(user_id);
alter table public.game_box_size_votes enable row level security;
revoke all on public.game_box_size_votes from public,anon,authenticated;
grant select,insert,update,delete on public.game_box_size_votes to authenticated;
create policy "Collectors read box format votes" on public.game_box_size_votes for select to authenticated using(true);
create policy "Collectors cast their own format vote" on public.game_box_size_votes for insert to authenticated with check(user_id=(select auth.uid()));
create policy "Collectors change their own format vote" on public.game_box_size_votes for update to authenticated
  using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy "Collectors remove their own format vote" on public.game_box_size_votes for delete to authenticated using(user_id=(select auth.uid()));

-- Existing games UPDATE policy restricts the explicit default to admins.
create function public.default_game_box_size(p_game_id uuid) returns uuid
language sql stable security invoker set search_path='' as $$
  select coalesce(g.default_box_size_id, (
    select s.id from public.game_box_sizes s join public.game_box_size_votes v on v.size_id=s.id and v.game_id=s.game_id
    where s.game_id=g.id group by s.id,s.created_at
    order by count(*) desc,s.created_at,s.id limit 1
  )) from public.games g where g.id=p_game_id;
$$;
create function public.add_default_collection_copy(p_game_id uuid) returns uuid
language plpgsql security invoker set search_path='' as $$
declare copy_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'Sign in to add a game'; end if;
  insert into public.board_games_box_association(game_id,game_box_size_id)
    values(p_game_id,public.default_game_box_size(p_game_id)) returning id into copy_id;
  return copy_id;
end $$;
revoke all on function public.default_game_box_size(uuid),public.add_default_collection_copy(uuid) from public,anon;
grant execute on function public.default_game_box_size(uuid),public.add_default_collection_copy(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
