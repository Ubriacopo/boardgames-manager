alter table public.container_box
  add column if not exists layout_direction text not null default 'vertical'
  check (layout_direction in ('vertical', 'horizontal'));

alter table public.game_placements
  drop column if exists orientation;
