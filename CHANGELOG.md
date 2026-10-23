# Changelog

## Unreleased

### Added

- Separate admin game editor opened from an edit icon on game pages, with shared name, year, fallback cover, and default format fields plus cover, wallpaper, logo, and box-side artwork controls. Saved details update discovery and collections.

- Per-copy cube rotation beside the unassign button, cycling W×D, H×D, and W×H. Defaults follow cube layout (W×D horizontal, H×D vertical); saved faces appear on shared shelves.

- Quick add uses the default box format; a separate **+ special** opens edition/custom dimensions. Admins can pin a default, otherwise one vote per collector/game determines the format. Existing copies retain their chosen sizes; games without a chosen default use explicitly reported estimated shelf dimensions.

- Saved library colors, editable beside the Library dropdown and during creation. Collection and New use colored library chips beside game metadata, with contrasting text.

- Multiple named Kallax libraries, selected or created from the Library dropdown. Each has its own cubes and layout; shared collections also offer library selection. Collection and New show all owned games with library chips, and Collection offers an optional current-library filter.

- Shared WebStorm **Kallboard LAN** launch configuration, `npm run dev:lan`, and a Windows firewall setup script limited to TCP 4200 from local subnets.

- Shared game definitions, reusable edition/country box-size variants, and owned-copy associations with private size overrides. Adding a game now includes a size choice, and owned games can switch variants or add another copy.

- Profile display zoom from 100% to 200%, saved in this browser, enlarging Kallax labels, game rows, and the wider interface. Game rows scale their covers and spacing and wrap titles.

- Public profile pictures with upload controls in Profile and initials for missing or unavailable pictures.

- Separate admin uploads for game-page logos and Kallax box-side artwork. Logos retain their image proportions inside rounded bounds; browsing continues to use covers. Shelf artwork uses the box side first, then wallpaper, then the cover when neither is available, in both vertical and horizontal layouts.

- Game pages have a shaded wallpaper behind the cover and title. Admins can upload and crop a separate wallpaper with a landscape preset; the cover remains independent.

- Cover uploads now offer a draggable crop preview, zoom, position sliders, and portrait, square, or original proportions before saving.

- Login and registration show a modal loading overlay through authentication and library navigation, with reduced-motion support.

- Admin cover editing from a game's cover, with image uploads saved to a shared database catalog and Supabase Storage.
- Required unique handles during registration, reserved atomically before email confirmation.
- Similar game and collector search, including typo handling and relevance ranking.

- Friends tab with public-handle search, approval-based friendships, one-way follows, incoming requests, and connection removal.
- Profile settings for public names, handles, and whether new connections require approval.
- Read-only collection browsing for approved friends and followed collectors, with Kallax and searchable list views.
- Database policies for connection-based collection access while keeping account emails private and collection writes owner-only.

### Fixed

- Kallax title fonts, padding, and borders scale with spine thickness in both orientations; long names still truncate with an ellipsis.

- Kallax spines use box depth as their visible thickness: upright boxes render depth × height, and horizontal boxes render width × depth, in personal and shared shelves.

- Unassigned copies now belong to the collector's overall collection without a library. Placing a copy assigns the cube's library, and unassigning it clears membership; existing owners are preserved by migration. The unassigned tray is shared across Kallax shelves.
- Owned games expose **Add another copy** directly on Overview, opening the edition selector for an independent, initially unassigned copy. Identical copies are supported.

- Returning from a game preserves the last selected library tab. Touch dragging waits for a short hold so collection rows allow normal mobile scrolling.
- Review editor loading, errors, and publishing now update reactively; review loading times out after 15 seconds and the editor has a visible writing area.

- Added the tracked Tailwind PostCSS configuration so fresh checkouts generate utility styles instead of shipping unprocessed Tailwind directives.

- Profile and friends pages now use reactive loading, error, and action state so completed Supabase requests update the screen immediately.
- Public profile requests have a 15-second network timeout.

### Changed

- Browsing and collection game lists use dividers instead of filled row backgrounds. Selected cube contents have compact spacing and dividers.

- Box-size inputs, edition options, and shelf dimension labels now use centimetres with 0.1 cm increments. Existing millimetre storage and physical shelf calculations are preserved.

- Updated compatible dependencies, including Angular 20 security patches, Supabase, DOMPurify, and Marked. Replaced the build-tool package with `@angular/build` to remove unused Webpack dependencies. The dependency audit now reports only the existing low-severity Quill HTML-export advisory, which has no published patch.

- Normalized `board_games` into `games`, `game_box_sizes`, and `board_games_box_association`; placement and order now live on each copy. Existing records are preserved with private recovery snapshots, and collection moves use an atomic database function.

- Replaced custom presentation CSS with Tailwind utilities across shelves, game rows, social pages, artwork controls, and dialogs. Shared game spines and crop sliders reuse Angular components/directives.

- Kallax game boxes show larger centered uppercase names on rounded white labels with theme-colored borders in both personal and friends' shelves.

- Friends now has Followed and Followers tabs with profile pictures and collection links, a + button for search, and incoming/sent requests under the corresponding tabs.

- Logo crops are saved as PNG with transparency preserved, including semi-transparent edges, and displayed without a background or hover tint.

- The cover editor keeps Crop & zoom collapsed by default and removes nested side padding on mobile.

- Opening the cover editor loads the current image for cropping without selecting a replacement file; the Crop & zoom panel starts closed.

- Crop and zoom controls live in a visible expandable panel with prominent sliders and a wider desktop editor.

- Cover editing uses a clearly labeled Browse image button and selected filename, with no image URL field.

- Handles now use lowercase letters, numbers, and dots, with a single editable handle field in Profile.

- Shelf grid dimensions are saved so visitors see the owner’s chosen arrangement.
- Bottom navigation now shows Discover, Friends, a raised green Kallax link, Sessions, and Profile.


### Planned

- Render each Kallax cube as a filled shelf using game-box spine artwork when it is available, with a generated visual fallback when it is not.
- Add a game-image catalog that records trusted cover and spine image sources, attribution, and user overrides.
- Track reviews as part of the owned-game record and show review state from the collection.
- Record play history, including play date, player count, participants when desired, and preferred player counts for each game.


## HUGE
- Change from supabase to sqllite so that a user can use it offline.
  - Updates would update the games library (in accordance to customly added ones)
  - Maybe it would be a part of the software only so that I can give it as a live service 
    - So if offline? Use sqllite -> Can edit
    - Once online? Sync and so allow deeper functionalities
    - Peremette di non iscriversi e stare solo offline senza sync
