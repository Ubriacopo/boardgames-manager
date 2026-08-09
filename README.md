# Kallboard

Kallboard is a platform for managing and tracking your board game collection.

## Roadmap

### Now: complete the Supabase integration

- [ ] Make the database reproducible with migrations for profiles, libraries,
  reviews, voting sessions, and votes.
- [ ] Add and verify Row Level Security policies for every user-owned resource.
- [ ] Finish authentication and profile flows, including session recovery and
  useful loading and error states.
- [ ] Complete collection persistence: add, edit, remove, favorite, and track
  owned games and play counts.
- [ ] Generate and use up-to-date Supabase database types throughout the app.
- [ ] Cover the main authenticated data flows with tests.

### Next: desktop UI

- [ ] Rework the desktop layout, navigation, spacing, and information density.
- [ ] Improve the collection and game-detail views for larger screens.
- [ ] Refine the Kallax-style shelf, including box dimensions and horizontal,
  vertical, and side orientations.
- [ ] Keep the layouts responsive and accessible across desktop and mobile.

### Later: community features

- [ ] Finish game reviews.
- [ ] Complete Spotify Jam-style sessions for voting on which game to play.
- [ ] Add event organization and lobbies.
- [ ] Add groups, with clans considered after the core social flows are proven.

### Later: dedicated backend service

Develop a first-party backend service once the Supabase integration and core
product flows are stable. Introduce it incrementally for workloads that benefit
from custom server-side logic while retaining Supabase where it remains useful.

- [ ] Define which responsibilities should move behind the backend API.
- [ ] Design authentication, authorization, and data-access boundaries.
- [ ] Implement, deploy, and monitor the service.
- [ ] Migrate features incrementally without disrupting the existing app.

### Later: review topic modelling

Integrate the ABAE-based model from
[boardgames-aspect-extraction](https://github.com/Ubriacopo/boardgames-aspect-extraction)
to recognize the aspects discussed in board game reviews. Extracted topics will
help organize and filter reviews by themes such as components, mechanics, and
complexity.

- [ ] Package preprocessing and ABAE inference as a reproducible service.
- [ ] Define a stable topic taxonomy and map model outputs to readable labels.
- [ ] Run topic extraction when reviews are created or updated.
- [ ] Store topic assignments and confidence scores in Supabase.
- [ ] Add topic filters and summaries to the review UI.
- [ ] Evaluate predictions on real reviews before enabling the feature by
  default.

## Setup

Create a `.env` file in the project root:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

The variable names intentionally remain compatible with the previous Vite app.
The start and build scripts generate Angular's local environment module from
these values. Only a Supabase publishable key belongs in this client-side file;
never use a secret or service-role key.

Install and run:

```bash
npm install
npm run dev
```

Open `http://localhost:4200`.

## Commands

- `npm run dev` — start Angular's development server
- `npm run build` — create a production bundle in `dist/boardgames-manager`
- `npm test` — run Angular tests
- `npm run backfill:bgg-images` — run the existing BGG image backfill
- `npm run backfill:search-images` — run the existing search image backfill
