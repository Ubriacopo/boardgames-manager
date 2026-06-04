create table if not exists public.container_box (
  id integer primary key,
  label text,
  created_at timestamptz not null default now()
);

insert into public.container_box (id, label)
select box_id, 'Cube ' || lpad(box_id::text, 2, '0')
from generate_series(1, 16) as box_id
on conflict (id) do nothing;

alter table public.board_games
  add column if not exists box integer references public.container_box (id);
