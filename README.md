# Boardgames Manager

An Angular 20 application for organizing a personal board-game library in a
Kallax shelf. The interface uses Angular Material and the Angular CDK, while
authentication and library persistence are provided by Supabase.

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
