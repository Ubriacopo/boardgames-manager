alter table public.container_box
  add column if not exists description text;

notify pgrst, 'reload schema';
