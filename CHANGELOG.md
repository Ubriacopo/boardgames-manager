# Changelog

## Unreleased

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