alter table public.container_box
  alter column inner_depth_mm set default 370;

update public.container_box
set inner_depth_mm = 370
where inner_depth_mm = 390;
