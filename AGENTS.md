# Repository guide

## Product and priorities

Kallboard manages board game collections, Kallax shelves, reviews, and voting
sessions. Read `README.md` for setup and the broader roadmap, and `CHANGELOG.md`
for planned work before making product changes.

The changelog describes a future SQLite-based offline mode: users should be able
to manage a collection without registering, with optional synchronization and
additional online features. This is a planned direction; the current application
uses Supabase and requires authentication for most routes. Do not assume local
persistence or synchronization already exists, or begin a backend migration as
part of unrelated work.

Other planned work includes shelf spine artwork and fallbacks, an image catalog
with source attribution and overrides, physical box placement, owned-game review
state, and play history. Some supporting placement and dimension code already
exists; inspect the implementation before treating a roadmap item as absent.

## Stack and layout

- Angular 20, strict TypeScript, standalone components, Angular Material/CDK,
  Tailwind CSS 4, and RxJS. This is an Angular app despite the retained `VITE_`
  environment variable names.
- `src/main.ts`: application bootstrap, hash routing, and view transitions.
- `src/app/app.routes.ts`: lazy page routes and the library authentication guard.
- `src/app/pages/`: route components and their HTML templates.
- `src/app/components/`: reusable collection and game presentation components.
- `src/app/services/`: authentication, collection state, reviews, themes, and
  voting sessions. Shared reactive state uses Angular signals and computed values.
- `src/entities/`: domain types, often derived from database row types.
- `src/types/database.types.ts`: Supabase database types.
- `src/utils/`: typed Supabase client, BGG metadata helpers, and Markdown rendering.
- `src/index.css` and `src/App.css`: global styling; both are registered in
  `angular.json`.
- Game storage uses `games` for shared definitions, `game_box_sizes` for edition/
  country variants, and `board_games_box_association` for owned copies, shelf
  placement/order, favorites, and private dimension overrides. `BoardGame` is a
  presentation projection of these records; `GamePlacement` is derived from a
  copy rather than a separate table. Do not reintroduce duplicated game metadata
  or placement storage on owned copies.
- `supabase/migrations/`: versioned SQL schema and access policies.
- `public/bgg-data/boardgames_ranks.csv`: bundled BGG catalog data.
- `scripts/`: environment generation and image backfill utilities.

## Local commands and configuration

`package.json` pins Node 24.13.0 and npm 11.6.2 through Volta.

- `npm install`: install dependencies.
- `npm run dev` (or `npm start`): generate the environment module and serve at
  `http://localhost:4200`.
- `npm run build`: generate the environment module and build for production.
  Browser artifacts are under `dist/boardgames-manager/browser`.
- `npm test`: currently points to `ng test`, but `angular.json` has no test target
  configured. Do not report this as a working test suite.
- No lint script is currently defined.
- `npm run backfill:bgg-images` and `npm run backfill:search-images` are data
  maintenance commands. Inspect their behavior and target before running them.

Supply `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` through the root
`.env` or the process environment. The generator also reads `src/.env`, which
overrides root file values; process environment values take precedence over both.
`scripts/write-angular-env.mjs` writes
`src/environments/environment.generated.ts`. Do not edit this generated file or
commit credentials. Only publishable keys belong in the browser application.

Generated output, `.env` files, `node_modules`, `.angular`, and `package-lock.json`
are currently ignored. Do not change dependency or lockfile policy incidentally.

## Implementation conventions

- Follow the JetBrains code style and `.editorconfig` rules below. Keep
  TypeScript and Angular template strictness enabled.
- Extend existing services for shared state and persistence; reuse entity and
  database types rather than duplicating row definitions.
- Preserve loading and error feedback. When changing optimistic updates, keep
  the rollback path consistent with all affected signals.
- Shelf changes must account for unassigned games, cube capacity, placement
  order, orientation, and physical dimensions where relevant.
- Retain hash routing and subpath-compatible asset references. GitHub Pages
  builds use `--base-href=/boardgames-manager/`.
- Preserve the existing Markdown sanitization path when changing review display.
- Keep changes focused. Update documentation when behavior or setup changes, and
  distinguish planned features from completed changes in the changelog.

## Code formatting and indentation

- Respect the user's IDEA/WebStorm code style. The current project uses the
  JetBrains **Default** scheme, with no project-specific overrides. `.editorconfig`
  records its indentation so CLI edits and the IDE agree.
- Use spaces: **4 spaces** per level for TypeScript, JavaScript/MJS, Angular HTML
  templates (including inline templates), CSS, SQL, XML, and PowerShell. Use
  **2 spaces** for JSON and YAML. Continuation indentation is **8 spaces** unless
  the IDE aligns a continuation with an existing element.
- Do not copy inconsistent indentation from older files or introduce a formatter
  with different defaults. Prefer the JetBrains **Reformat Code** action or its
  command-line `format.sh` with the user's code-style XML settings.
- Format changed source files before finishing. Repository-wide formatting must
  exclude dependencies, build output, generated environment modules, bundled
  catalog data, and archived database exports under `docs/database-export/`.
- Use PostgreSQL-aware formatting for SQL. Preserve literal content and SQL
  behavior; formatting alone must not execute or replay migrations.
- If the user changes their IDEA settings, update `.editorconfig` and these rules
  to match before applying further formatting changes.

## Styling: Tailwind first

- Use Tailwind utilities in Angular templates wherever practical. This is the
  required default for new UI and changes to existing UI, even when nearby code
  uses custom CSS.
- Express layout, spacing, sizing, typography, colors, borders, responsive rules,
  interaction states, and container queries with utilities and variants. Use
  arbitrary values or CSS-variable utilities when the standard scale does not
  cover the design.
- Reuse existing theme tokens so styles follow the selected theme. Prefer
  relative units for text and controls that should follow display zoom.
- Do not add custom classes, inline component styles, global selectors, or
  `@apply` blocks merely to group declarations that utilities can express.
  Reuse Angular components for repeated UI patterns.
- Reserve custom CSS for shared theme variables, base styles, third-party
  integration overrides, or behavior that utilities cannot reasonably express.
  Keep each exception minimal and explain why it is needed in a nearby comment.
- When touching an existing custom rule, move the affected styling into template
  utilities where practical and remove obsolete declarations. Keep this cleanup
  scoped to the requested change.
- Before finishing UI work, review added or modified CSS against these rules and
  replace avoidable custom CSS with Tailwind utilities.

## Backend work

Read `.agents/skills/supabase/SKILL.md` before Supabase work and
`.agents/skills/supabase-postgres-best-practices/SKILL.md` when writing or reviewing
Postgres queries or schema, when those local skills are available. Consult current
documentation as required by those skills before implementing backend features.

Keep schema changes reproducible in migrations and database types aligned with
the schema. Preserve authorization and user/library isolation through RLS; route
guards alone do not protect database records. Never place a service-role or secret
key in frontend code.

## Validation and deployment

Choose checks appropriate to the requested change, and accurately report what
ran and any blockers. A documentation-only update does not need an application
build. For application changes, `npm run build` checks TypeScript, templates, and
bundle budgets; it does not prove authenticated database flows work. There is no
configured automated test target at present.

`.github/workflows/deploy-pages.yml` builds and deploys GitHub Pages on pushes to
`master` and on manual dispatch. Account for that deployment effect before
pushing changes to `master`.
