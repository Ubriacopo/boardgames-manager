-- Point games at the representative editions seeded in the preceding migration.
-- Preserve any default already selected by an administrator.
with default_profiles(bgg_id, label, country) as (values (342942, 'English edition (2025)', ''),
                                                         (3955, 'English edition (2003)', 'United States'),
                                                         (13, 'English edition (2019)', 'United States'),
                                                         (278, 'English first edition (1998)', ''),
                                                         (92828, 'Western European edition (2014)', ''),
                                                         (123, 'Playful Minds edition (1996)', 'United States'),
                                                         (366013, 'English edition (2023)', ''),
                                                         (254640, 'English edition (2024)', ''),
                                                         (237182, 'English sixteenth printing (2025)', ''),
                                                         (128667, 'Spanish edition (2013)', 'Spain'),
                                                         (266192, 'English edition (2022)', ''),
                                                         (338834, 'English edition (2025)', 'United Kingdom'),
                                                         (377, 'Milton Bradley edition (1989)', 'United States'),
                                                         (410201, 'Matagot French edition (2024)', 'France'))
update public.games g
set default_box_size_id = s.id
from default_profiles d
         join public.game_box_sizes s on s.label = d.label and s.country = d.country
where g.bgg_id = d.bgg_id
  and s.game_id = g.id
  and g.default_box_size_id is null;
