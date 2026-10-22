# Changelog

## Unreleased

### Added

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

- Profile and friends pages now use reactive loading, error, and action state so completed Supabase requests update the screen immediately.
- Public profile requests have a 15-second network timeout.

### Changed

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
- Store physical box dimensions and a placement for every owned game, including vertical or horizontal orientation and its display order inside a Kallax cube.
- Track reviews as part of the owned-game record and show review state from the collection.
- Record play history, including play date, player count, participants when desired, and preferred player counts for each game.


## HUGE
- Change from supabase to sqllite so that a user can use it offline.
  - Updates would update the games library (in accordance to customly added ones)
  - Maybe it would be a part of the software only so that I can give it as a live service 
    - So if offline? Use sqllite -> Can edit
    - Once online? Sync and so allow deeper functionalities
    - Peremette di non iscriversi e stare solo offline senza sync