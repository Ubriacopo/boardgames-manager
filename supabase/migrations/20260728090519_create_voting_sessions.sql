create table public.voting_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  code text not null unique,
  title text not null default 'What should we play?',
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create table public.session_games (
  session_id uuid not null references public.voting_sessions (id) on delete cascade,
  game_id uuid not null,
  game_snapshot jsonb not null,
  primary key (session_id, game_id)
);

create table public.session_votes (
  session_id uuid not null references public.voting_sessions (id) on delete cascade,
  game_id uuid not null,
  voter_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (session_id, voter_id),
  foreign key (session_id, game_id) references public.session_games (session_id, game_id) on delete cascade
);

alter table public.voting_sessions enable row level security;
alter table public.session_games enable row level security;
alter table public.session_votes enable row level security;

create policy "Owners create voting sessions" on public.voting_sessions for insert
  to authenticated with check ((select auth.uid()) = owner_id);
create policy "Open voting sessions are shareable" on public.voting_sessions for select
  to anon, authenticated using (status = 'open' and expires_at > now() or owner_id = (select auth.uid()));
create policy "Owners manage voting sessions" on public.voting_sessions for update
  to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create policy "Owners add games to sessions" on public.session_games for insert
  to authenticated with check (exists (
    select 1 from public.voting_sessions s where s.id = session_id and s.owner_id = (select auth.uid())
  ));
create policy "Games in open sessions are shareable" on public.session_games for select
  to anon, authenticated using (exists (
    select 1 from public.voting_sessions s where s.id = session_id and s.status = 'open' and s.expires_at > now()
  ));

create policy "Votes in open sessions are visible" on public.session_votes for select
  to anon, authenticated using (exists (
    select 1 from public.voting_sessions s where s.id = session_id and s.status = 'open' and s.expires_at > now()
  ));
create policy "Guests can vote in open sessions" on public.session_votes for insert
  to anon, authenticated with check (exists (
    select 1 from public.voting_sessions s where s.id = session_id and s.status = 'open' and s.expires_at > now()
  ));
create policy "Guests can change their vote" on public.session_votes for update
  to anon, authenticated using (exists (
    select 1 from public.voting_sessions s where s.id = session_id and s.status = 'open' and s.expires_at > now()
  )) with check (exists (
    select 1 from public.voting_sessions s where s.id = session_id and s.status = 'open' and s.expires_at > now()
  ));

grant select on public.voting_sessions, public.session_games to anon, authenticated;
grant select (session_id, game_id, created_at) on public.session_votes to anon, authenticated;
grant insert on public.session_votes to anon, authenticated;
grant update on public.session_votes to anon, authenticated;
grant insert, update on public.voting_sessions to authenticated;
grant insert on public.session_games to authenticated;
