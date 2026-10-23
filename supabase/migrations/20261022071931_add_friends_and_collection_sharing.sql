-- Public social identity is deliberately separate from private app_users.email.
create table public.social_profiles
(
    id              uuid primary key references public.app_users (id) on delete cascade,
    handle          text not null unique check (handle ~ '^[a-z0-9_]{3,40}$'),
    display_name    text not null check (char_length(btrim(display_name)) between 1 and 80),
    connection_mode text not null default 'approval' check (connection_mode in ('approval', 'follow'))
);
insert into public.social_profiles(id, handle, display_name)
select id, 'player_' || replace(id::text, '-', ''), 'Board game collector'
from public.app_users;

create table public.social_connections
(
    id           uuid primary key     default gen_random_uuid(),
    requester_id uuid        not null references public.social_profiles (id) on delete cascade,
    recipient_id uuid        not null references public.social_profiles (id) on delete cascade,
    kind         text        not null check (kind in ('friend', 'follow')),
    status       text        not null check (status in ('pending', 'accepted')),
    created_at   timestamptz not null default now(),
    check (requester_id <> recipient_id),
    check (kind <> 'follow' or status = 'accepted')
);
create unique index social_friend_pair on public.social_connections
    (least(requester_id, recipient_id), greatest(requester_id, recipient_id)) where kind = 'friend';
create unique index social_follow_pair on public.social_connections (requester_id, recipient_id) where kind = 'follow';
create index social_connections_recipient_idx on public.social_connections (recipient_id, status);
create index social_connections_requester_idx on public.social_connections (requester_id, status);

alter table public.social_profiles
    enable row level security;
alter table public.social_connections
    enable row level security;
revoke all on public.social_profiles, public.social_connections from anon, authenticated;
grant select, insert, update on public.social_profiles to authenticated;
grant select, insert, delete on public.social_connections to authenticated;
-- Only the status may change after creation; IDs, endpoints and kind are immutable.
grant update (status) on public.social_connections to authenticated;

create policy "Collectors can discover public profiles" on public.social_profiles
    for select to authenticated using (true);
create policy "Collectors create their own social profile" on public.social_profiles
    for insert to authenticated with check (id = (select auth.uid()));
create policy "Collectors edit their own social profile" on public.social_profiles
    for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "Participants read connections" on public.social_connections
    for select to authenticated
    using ((select auth.uid()) in (requester_id, recipient_id));
create policy "Collectors request friendship or follow according to recipient settings" on public.social_connections
    for insert to authenticated with check (
    requester_id = (select auth.uid()) and exists (select 1
                                                   from public.social_profiles p
                                                   where p.id = recipient_id
                                                     and (
                                                       (p.connection_mode = 'approval' and kind = 'friend' and status = 'pending')
                                                           or
                                                       (p.connection_mode = 'follow' and kind = 'follow' and status = 'accepted')))
    );
create policy "Recipients accept pending friendships" on public.social_connections
    for update to authenticated
    using (recipient_id = (select auth.uid()) and kind = 'friend' and status = 'pending')
    with check (recipient_id = (select auth.uid()) and kind = 'friend' and status = 'accepted');
create policy "Participants remove connections or decline requests" on public.social_connections
    for delete to authenticated using ((select auth.uid()) in (requester_id, recipient_id));

-- SELECT-only sharing. Existing ownership predicates on writes remain in force.
-- Follow access stops immediately when the recipient switches to approval mode.
create policy "Connections can read shared libraries" on public.libraries
    for select to authenticated using (
    exists (select 1
            from public.social_connections c
            where c.status = 'accepted'
              and (
                (c.kind = 'friend' and (
                    (c.requester_id = (select auth.uid()) and c.recipient_id = libraries.user_id)
                        or (c.recipient_id = (select auth.uid()) and c.requester_id = libraries.user_id)))
                    or
                (c.kind = 'follow' and c.requester_id = (select auth.uid()) and c.recipient_id = libraries.user_id
                    and exists (select 1
                                from public.social_profiles p
                                where p.id = libraries.user_id
                                  and p.connection_mode = 'follow'))
                ))
    );
create policy "Connections can read shared games" on public.board_games
    for select to authenticated using (
    exists (select 1
            from public.libraries l
            where l.id = board_games.library_id)
    );
create policy "Connections can read shared cubes" on public.container_box
    for select to authenticated using (
    exists (select 1
            from public.libraries l
            where l.id = container_box.library_id)
    );
create policy "Connections can read shared placements" on public.game_placements
    for select to authenticated using (
    exists (select 1
            from public.board_games g
            where g.id = game_placements.game_id)
    );

-- New accounts receive a discoverable handle when their app profile is created.
create function public.create_social_profile()
    returns trigger
    language plpgsql
    security invoker set search_path = '' as
$$
begin
    insert into public.social_profiles(id, handle, display_name)
    values (new.id, 'player_' || replace(new.id::text, '-', ''), 'Board game collector');
    return new;
end;
$$;
revoke all on function public.create_social_profile() from public, anon, authenticated;
create trigger create_social_profile_after_app_user_insert
    after insert
    on public.app_users
    for each row
execute function public.create_social_profile();

-- Persist the owner's chosen grid so visitors see the same shelf arrangement.
alter table public.libraries
    add column shelf_columns integer,
    add column shelf_rows    integer,
    add constraint libraries_shelf_grid_check check (
        (shelf_columns is null and shelf_rows is null)
            or (shelf_columns is not null and shelf_rows is not null
            and shelf_columns between 1 and 12 and shelf_rows between 1 and 12)
        );

create index if not exists board_games_library_id_idx on public.board_games (library_id);
create index if not exists container_box_library_id_idx on public.container_box (library_id);
