begin;

-- Measurements are outer retail box dimensions, in millimetres.
-- Guards of Atlantis II, English second edition (2025):
-- https://boardgamegeek.com/boardgameversion/658547/english-second-edition
-- 12.80 x 12.80 x 2.68 inches, rounded to the nearest millimetre.
-- The Isle of Cats, compact retail box (other printings use larger boxes):
-- https://madeincamelot.co.uk/products/the-isle-of-cats
-- Magic is a game system with many packages. Use an explicitly named retail
-- product as its representative default, rather than claiming a universal size:
-- https://wpn.wizards.com/es/products/product-set-or-2022-starter-kit

create temporary table box_size_profile_import
(
    bgg_id    integer primary key,
    label     text    not null,
    country   text    not null,
    width_mm  integer not null,
    height_mm integer not null,
    depth_mm  integer not null
) on commit drop;

insert into box_size_profile_import
values (267609, 'English second edition (2025)', '', 325, 325, 68),
       (281259, 'English retail edition (compact box)', '', 300, 300, 74),
       (463, '2022 Starter Kit (retail box)', '', 194, 178, 51);

insert into public.game_box_sizes
    (game_id, label, country, width_mm, height_mm, depth_mm)
select g.id, d.label, d.country, d.width_mm, d.height_mm, d.depth_mm
from box_size_profile_import d
         join public.games g on g.bgg_id = d.bgg_id
on conflict (game_id, label, country, width_mm, height_mm, depth_mm) do nothing;

-- This is a separate statement so it can see the newly inserted profiles.
update public.games g
set default_box_size_id = s.id
from box_size_profile_import d
         join public.game_box_sizes s
              on s.label = d.label and s.country = d.country
                  and s.width_mm = d.width_mm and s.height_mm = d.height_mm
                  and s.depth_mm = d.depth_mm
where g.bgg_id = d.bgg_id
  and s.game_id = g.id
  and g.default_box_size_id is null;

-- Correct the earlier import's publisher attribution without changing its size.
-- https://www.nobleknight.com/P/2148258823/Neighbors
update public.game_box_sizes s
set label = 'M&P Distributors edition (1989)'
from public.games g
where s.game_id = g.id
  and g.bgg_id = 377
  and s.label = 'Milton Bradley edition (1989)'
  and s.country = 'United States'
  and s.width_mm = 508
  and s.height_mm = 254
  and s.depth_mm = 51;

-- The normalization migration retained the old 50 x 200 x 100 mm application
-- placeholders as private overrides. They hide real catalog sizes on existing
-- copies. Attach the default profile to every copy without a selected edition,
-- clearing only this exact old placeholder. Keep deliberate private measurements.
-- Some legacy copies have no recoverable owner. Temporarily suspend this one
-- trigger inside the transaction so a dimensions-only correction does not
-- revalidate or change their old placement/ownership. The ALTER TABLE lock blocks
-- concurrent writes until the trigger is restored and the transaction commits;
-- foreign keys, check constraints, and RLS remain enabled throughout.
alter table public.board_games_box_association
    disable trigger validate_collection_copy_before_write;

update public.board_games_box_association a
set game_box_size_id = g.default_box_size_id,
    updated_at       = now(),
    custom_width_mm  = case
                           when a.custom_width_mm = 50 and a.custom_height_mm = 200 and a.custom_depth_mm = 100
                               then null
                           else a.custom_width_mm end,
    custom_height_mm = case
                           when a.custom_width_mm = 50 and a.custom_height_mm = 200 and a.custom_depth_mm = 100
                               then null
                           else a.custom_height_mm end,
    custom_depth_mm  = case
                           when a.custom_width_mm = 50 and a.custom_height_mm = 200 and a.custom_depth_mm = 100
                               then null
                           else a.custom_depth_mm end
from public.games g
where a.game_id = g.id
  and g.default_box_size_id is not null
  and a.game_box_size_id is null;

alter table public.board_games_box_association
    enable trigger validate_collection_copy_before_write;

commit;
