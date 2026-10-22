create table public.game_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.app_users (id) on delete cascade,
  bgg_id bigint not null,
  rating smallint not null check (rating between 1 and 10),
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, bgg_id)
);

create index game_reviews_bgg_id_idx on public.game_reviews (bgg_id);

alter table public.game_reviews enable row level security;

create policy "Authenticated users can read local reviews"
  on public.game_reviews for select
  to authenticated
  using (true);

create policy "Users can create their own reviews"
  on public.game_reviews for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own reviews"
  on public.game_reviews for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own reviews"
  on public.game_reviews for delete
  to authenticated
  using ((select auth.uid()) = user_id);
