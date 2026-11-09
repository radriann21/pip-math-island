# Pip's Math Island

A math game for primary school children (grades 1-6). Parents sign in, create child profiles, and each
child's progress, stars, stickers and streaks are stored in Supabase. A guest mode keeps everything in
`localStorage` when there is no account or no Supabase configuration.

## Stack

Vite, React 18, TypeScript (strict), React Router 6, Supabase (`@supabase/supabase-js`), Vitest + Testing Library,
ESLint (flat config), pnpm.

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` | Start the Vite dev server |
| `pnpm build` | Type-check, then build for production |
| `pnpm preview` | Preview the production build |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint, including the layer dependency rules |
| `pnpm test` | Run the test suite once |
| `pnpm test:watch` | Run Vitest in watch mode |

## Environment variables

Copy `.env.example` to `.env.local` and fill in:

- `VITE_SUPABASE_URL`: the Supabase project URL.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: the publishable (anon) key. Never use a secret key in the browser.

If either is missing, the app runs in guest/local mode.

## Architecture

Hexagonal layers (`domain`, `application`, `infrastructure`, `presentation`, `app`) with the dependency rule
enforced by ESLint. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Legacy prototype

`prototype/` holds the original single-file version. It is the behavioural reference for exercises, visuals,
copy and CSS, and is excluded from type-checking, linting and tests.
