# Catalog box-size import

The 2026-10-23 import uses outer box measurements in millimetres. A default is
a representative, explicitly named edition; another printing may have a
different box. Values published in inches are rounded to the nearest millimetre.

The live catalog has 20 game definitions. Seventeen have sourced default sizing
profiles. No verified outer box measurement was found for Peaceful Resistance,
Skworms, or Trolley Car. Their dimensions must be supplied or explicitly estimated
before they can receive a default profile.

## Additional profiles

| Game | Representative edition | Width × height × depth (mm) | Source |
| --- | --- | --- | --- |
| Guards of Atlantis II | English second edition (2025) | 325 × 325 × 68 | [BGG edition record](https://boardgamegeek.com/boardgameversion/658547/english-second-edition) |
| The Isle of Cats | English retail edition, compact box | 300 × 300 × 74 | [Made in Camelot](https://madeincamelot.co.uk/products/the-isle-of-cats) |
| Magic: The Gathering | 2022 Starter Kit, retail box | 194 × 178 × 51 | [Wizards Play Network](https://wpn.wizards.com/es/products/product-set-or-2022-starter-kit) |

The Magic profile describes that particular starter kit. Magic has many products
and storage boxes, so this is not a universal measurement for Magic collections.
The Isle of Cats also has larger retail and Kickstarter boxes; select a different
profile or use private measurements for those copies.

The earlier Neighbors import had the correct 508 × 254 × 51 mm measurements but
the wrong publisher in its edition label. The publisher is M&P Distributors,
according to the [retailer record](https://www.nobleknight.com/P/2148258823/Neighbors).

## Existing collection copies

Catalog defaults alone do not change existing copies. Copies use their selected
profile, and private overrides take precedence over that profile.

The normalization migration preserved the old application placeholder dimensions
of **50 × 200 × 100 mm** as private overrides. The follow-up import attaches a
game's default profile to copies with no selected profile, and clears overrides
only when they exactly equal that old placeholder. Distinct private measurements
and explicitly selected editions are preserved. Library membership, position,
order, favorites, and rotation are not modified.

The import is captured in
`supabase/migrations/20261023084754_complete_catalog_box_size_profiles.sql`.
Its SQL was applied directly to the linked database to avoid deploying a separate
rotation migration being edited at the same time. The data migration remains
pending in migration history and is safe to replay during the next `db push`.
Live verification found 22 copies with selected profiles, with distinct private
measurements retained on three of them. Sixteen copies had their old placeholder
overrides cleared. All 17 games with sourced defaults have profiles attached to
every existing copy. The copy ownership validation trigger was verified enabled
after the update.

The first 14 sourced profiles are captured in
`supabase/migrations/20261023074238_seed_default_game_box_sizes.sql` and
`supabase/migrations/20261023074423_link_default_game_box_sizes.sql`.
