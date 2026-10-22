alter table public.container_box enable row level security;

create policy "Container boxes are readable by everyone"
  on public.container_box
  for select
  using (true);
