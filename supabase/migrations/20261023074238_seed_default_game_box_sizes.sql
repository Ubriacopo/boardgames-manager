-- Default dimensions are representative retail editions, stored in millimetres.
-- Source records are edition-specific; dimensions follow the listed length x width x depth.
-- BGG version pages: https://boardgamegeek.com/boardgame/342942/ark-nova/versions
-- https://boardgamegeek.com/boardgame/3955/bang/versions
-- https://boardgamegeek.com/boardgame/13/catan/versions
-- https://boardgamegeek.com/boardgame/278/catan-card-game/versions
-- https://boardgamegeek.com/boardgame/92828/dixit-odyssey/versions
-- https://boardgamegeek.com/boardgame/366013/heat-pedal-to-the-metal/versions
-- https://boardgamegeek.com/boardgame/254640/just-one/versions
-- https://boardgamegeek.com/boardgame/237182/root/versions
-- https://boardgamegeek.com/boardgame/128667/samurai-sword/versions
-- https://boardgamegeek.com/boardgame/266192/wingspan/versions
-- Additional publisher/distributor sources:
-- https://www.nobleknight.com/P/2147751755/Green-Thumb
-- https://www.asmodee.co.uk/products/peg59061e-micromacro-crime-city-full-house
-- https://www.nobleknight.com/P/2148277259/Neighbors
-- https://surfinmeeple.com/produit/wyrmspan/

with source_data(bgg_id, label, country, width_mm, height_mm, depth_mm) as (values (342942, 'English edition (2025)',
                                                                                    '', 362, 298, 76),
                                                                                   (3955, 'English edition (2003)',
                                                                                    'United States', 127, 76, 25),
                                                                                   (13, 'English edition (2019)',
                                                                                    'United States', 295, 240, 80),
                                                                                   (278, 'English first edition (1998)',
                                                                                    '', 214, 160, 47),
                                                                                   (92828,
                                                                                    'Western European edition (2014)',
                                                                                    '', 284, 277, 58),
                                                                                   (123, 'Playful Minds edition (1996)',
                                                                                    'United States', 133, 89, 25),
                                                                                   (366013, 'English edition (2023)',
                                                                                    '', 297, 297, 104),
                                                                                   (254640, 'English edition (2024)',
                                                                                    '', 230, 160, 50),
                                                                                   (237182,
                                                                                    'English sixteenth printing (2025)',
                                                                                    '', 290, 229, 70),
                                                                                   (128667, 'Spanish edition (2013)',
                                                                                    'Spain', 190, 137, 45),
                                                                                   (266192, 'English edition (2022)',
                                                                                    '', 297, 297, 71),
                                                                                   (338834, 'English edition (2025)',
                                                                                    'United Kingdom', 275, 190, 35),
                                                                                   (377,
                                                                                    'Milton Bradley edition (1989)',
                                                                                    'United States', 508, 254, 51),
                                                                                   (410201,
                                                                                    'Matagot French edition (2024)',
                                                                                    'France', 296, 296, 70)),
     inserted as (
         insert into public.game_box_sizes (game_id, label, country, width_mm, height_mm, depth_mm)
             select g.id, d.label, d.country, d.width_mm, d.height_mm, d.depth_mm
             from source_data d
                      join public.games g on g.bgg_id = d.bgg_id
             where d.label <> ''
             on conflict (game_id, label, country, width_mm, height_mm, depth_mm) do nothing
             returning game_id, id, label)
update public.games g
set default_box_size_id = s.id
from source_data d
         join public.game_box_sizes s on s.label = d.label and s.country = d.country
         join public.games matched on matched.id = s.game_id and matched.bgg_id = d.bgg_id
where g.id = matched.id
  and g.default_box_size_id is null;
