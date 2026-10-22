# Database structure reference

This package contains the repository's PostgreSQL migration history and generated
TypeScript database definitions. It contains no exported account or collection
rows and no connection credentials. It is a reference for schema design or
conversion, **not a verified dump of the live database**. Migrations may contain
data transformations and Supabase bucket setup; do not run the history against
an existing database or import it directly into MySQL.

## Live schema-only dump

With Docker running, authenticate and link the intended project:

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db dump --linked --schema public --file docs/database-export/live-public-schema.sql
```

`db dump` exports structure by default, without table rows. This command targets
the application's public schema. Supabase-managed auth/storage schemas and the
private migration archive are outside its scope; public objects can reference
them. Review SQL function bodies and comments before sharing any live dump.

## MySQL conversion

Supabase uses PostgreSQL. A MySQL migration needs explicit conversions for UUIDs,
timestamp/time-zone handling, identity/sequence columns, JSON/array types where
used, regex checks, indexes, and SQL/PLpgSQL functions and triggers. Preserve
unique constraints and composite foreign keys, particularly the box-size/game
association. Keep dimensions as integer millimetres; the UI uses centimetres.

MySQL does not provide Supabase Auth, Storage, PostgREST, Realtime, or equivalent
PostgreSQL row-level security policies automatically. A backend must enforce
user/library ownership, friend collection access, and admin permissions. The
Angular client must call that backend rather than connect directly to MySQL.

Current entities and relationships are in `database.types.ts`; exact SQL types,
defaults, constraints, policies, functions, and their evolution are in
`migrations/`. Apply them in filename order only to a suitable isolated Supabase
development database when reconstructing the schema.

## Proposed offline direction (not implemented)

For read-only offline collection browsing, start with an Angular PWA and an
IndexedDB snapshot, plus cached artwork. Cache the app shell and lazy routes as
well as data. Put local and remote reads behind a collection repository so UI
components do not depend directly on Supabase availability.

Allow the library route to open a locally saved collection without requiring an
online load. Keep snapshots separated by user and clear them on sign-out/account
changes. Show the last refresh time and disable online-only features, including
friends, voting, publishing reviews, and admin uploads. Handle failed requests;
browser online status alone is not a reliable availability check.

SQLite becomes useful for a native application or substantial offline editing.
Capacitor can wrap the Angular app for Android/iOS with a SQLite plugin; Tauri can
wrap it for desktop with its SQL/SQLite plugin. A browser PWA requires no native
wrapper. SQLite alone supplies neither offline app loading nor synchronization.
If offline writes are added later, design an outbox, stable IDs, deletions,
conflict resolution, and server-side authorization separately.

References:
- https://supabase.com/docs/reference/cli/supabase-db-dump
- https://angular.dev/ecosystem/service-workers/getting-started
- https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- https://capacitorjs.com/docs
- https://v2.tauri.app/plugin/sql/
