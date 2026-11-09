# Feature: pip-math-island-platform

## Objective
Turn the single-file prototype ("Pip's Math Island") into a real project: Vite + React + TypeScript, hexagonal
architecture, and persistence in Supabase project `educative-project` (parent auth, child profiles, progress).

## Problem / why
The prototype keeps progress in one browser's localStorage, has no accounts, and is a single 900-line file.
Parents need accounts and multiple child profiles; progress must survive devices; code must be testable.

## Scope
Greenfield project in `~/pip-math-island` (branch `feat/platform`). Remote scope authorized by the user:
the Supabase project `educative-project` (migrations via MCP). No other remote destination, no deploy, no push.

## Constraints
- Architecture: `docs/ARCHITECTURE.md` is the contract. Prototype in `prototype/` is the behavioural reference.
- Strict TDD (source: session config), runner: Vitest (`pnpm test`). Exact dependency versions, lockfile committed.
- Conventional Commits, no AI attribution. RDD (native review) is OFF (global) -> ordinary checks only.
- Delivery: no git remote exists; work-unit commits on `feat/platform`; PR slicing (strategy `ask-on-risk`) deferred until a remote exists. Forecast ~6–7k authored lines.
- Path notes: planning heuristic ~400 authored lines per task is advisory only.

## Tasks
- [x] T1 Scaffold: Vite+React+TS strict, Vitest/RTL, ESLint layer rules, folders, scripts, `.env.example`, README skeleton — route: delegated writer
- [x] T2 Database: schema, RLS, indexes, RPCs `record_round` / `record_race`, migrations committed, advisors clean, generated types — route: inline (remote MCP)
- [ ] T3a Domain/exercises core: shared types, markup, SVG visuals, option helpers, checkAnswer, generateRound, race question, generators count/add/sub/mul/div + correctness tests — route: delegated writer
- [ ] T3b Domain/exercises rest: generators frac/place/time/money/geo/pattern/word + full-registry property tests — route: delegated writer
- [ ] T4 Domain/progression: stars, tiers, xp/levels, streak, daily goal, 12 badges, round scoring; unit tests — route: delegated writer
- [ ] T5 Application: ports, use cases, in-memory fakes, use-case tests — route: delegated writer
- [ ] T6 Infrastructure: Supabase adapters (auth, children, progress via RPC), local guest adapters, clock, composition root; adapter tests with mocked client — route: delegated writer
- [ ] T7 Presentation foundation: tokens/base CSS port, i18n (en/es), atoms+molecules (Pip, stars, buttons, keypad, option grid, visuals), RTL tests — route: delegated writer
- [ ] T8 Presentation pages: Auth, Child picker, Home, Quiz, Result, Race, Stickers, Parent dashboard (math gate), router — route: delegated writer
- [ ] T9 Integration & verification: typecheck, lint, tests, build, advisors, README, live smoke against Supabase — route: inline

## Acceptance criteria
- `pnpm typecheck && pnpm lint && pnpm test && pnpm build` all pass.
- Sign up/in works against `educative-project`; a child's round persists and reloads; RLS prevents cross-parent access (verified with SQL).
- Guest mode works with no Supabase env.
- Supabase security advisors report no RLS/exposure issues.

## Config
TDD: enabled (source: session instructions) · runner: `pnpm test` (Vitest) · RDD: off (global) · delivery: ask-on-risk, deferred (no remote).

## Progress
- T2 done (commit fac54bb): migrations `20261109120935_init_schema`, `20261109120945_record_rpcs` applied to educative-project and mirrored in `supabase/migrations/`. Types in `src/infrastructure/supabase/database.types.ts`.
- `.env.local` could not be written by the agent (permission denied); user must create it from `.env.example` with project URL + publishable key.

## Verification evidence
- T2: `supabase/tests/rls.sql` executed remotely -> `RLS_TEST_OK (rolled back)` (A isolated from B, anon denied, constraints reject invalid rounds, record_round accumulates and keeps best stars). Leftover check: 0 users, 0 children, 0 rounds.
- T2: security advisors: 0 lints. Performance advisors: 3 INFO `unused_index` (expected on empty DB; indexes back FK/history queries).

- T1 done (commits 1b5f377, f128023, fd94f6a): Vite 8 + React 18.3.1 + TS 6.0.3 (typescript-eslint caps TS <6.1) + Vitest 4 + ESLint 10 layer rules (violations observed failing lint). Local tools: fd/eza/rg/sd/brew missing, `bat` works; this `pnpm` rejects `-s`.
- T1 spot check by orchestrator: typecheck pass, lint pass, tests 11/11 pass.

## Next step
T3a.
