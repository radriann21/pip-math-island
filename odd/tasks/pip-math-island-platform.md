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
- [x] T3a Domain/exercises core: shared types, markup, SVG visuals, option helpers, checkAnswer, generateRound, race question, generators count/add/sub/mul/div + correctness tests — route: delegated writer
- [x] T3b Domain/exercises rest: generators frac/place/time/money/geo/pattern/word + full-registry property tests — route: delegated writer
- [x] T4 Domain/progression: stars, tiers, xp/levels, streak, daily goal, 12 badges, round scoring; unit tests — route: delegated writer
- [x] T5 Application: ports, use cases, in-memory fakes, use-case tests — route: delegated writer
- [x] T6 Infrastructure: Supabase adapters (auth, children, progress via RPC), local guest adapters, clock, composition root; adapter tests with mocked client — route: delegated writer
- [x] T7 Presentation foundation: tokens/base CSS port, i18n (en/es), atoms+molecules (Pip, stars, buttons, keypad, option grid, visuals), RTL tests — route: delegated writer
- [x] T8 Presentation pages: Auth, Child picker, Home, Quiz, Result, Race, Stickers, Parent dashboard (math gate), router — route: delegated writer
- [x] T9 Integration & verification (reduced by user: no README, no TDD): typecheck, lint, tests, build, advisors, README, live smoke against Supabase — route: inline

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

- T3a done (commits 9764a16 280fbbd 82ac48f 7cdf2f8 351f357 c81845b): shared types/locale, SVG visuals, options/answer, count/add/sub/mul/div generators with pure builders, registry/round/race. Prototype bugs fixed: gendered "Cuántas/Cuántos", ambiguous "between" options. Stricter `checkAnswer` (rejects "5abc"). Writer reported no observed RED for trivial atGrade/atTier helpers.
- T3a spot check by orchestrator: typecheck pass, lint pass, 203/203 tests pass.

- T3b done (commits c7a89f9 299c85b d4404e1 2dda5eb 69f148e 088c2e4 69dccf5 bb05fd7 ff248ce): frac/place/time/money/geo/pattern/word, 12 topics registered. Prototype defects fixed: recursive decimal-digit branch, inconsistent decimal compare, ambiguous patterns, silent coin fallback, fraction distractors equal to the answer, rounding option collapse, square offered as rectangle, non-LCD unlike sums. Only observed RED for topic files was the missing-import failure; sweep test proven able to fail by a deliberate break.
- T3b spot check by orchestrator: typecheck pass, lint pass, 438/438 tests pass.
- Decision: T4 (progression) and T5 (application) are given to one writer sequentially (small domain slice, same contract).

- T4+T5 done (commits 0c57999 48fda6d 8d5c538 5b7961c c7a9516 19eac20 f450418 8b4ed17 e27ad2a): progression domain (scoreRound, levels, streak, daily bonus, 12 badges, race tracker), application model/ports/errors, 15 use cases, `projection.ts` (applyRound/applyRace mirror the SQL RPCs, reused by fakes and local adapter), in-memory fakes, `createTestDeps()`. `startRound`/`startRace` are synchronous.
- Tech debt: vitest `testTimeout` raised to 30000 because the `place` rounding property test is slow (~4s) and flaked under parallel load; optimise later (T9).
- T4+T5 spot check by orchestrator: typecheck pass, lint pass, 628/628 tests pass.

- T6 done (commits 0aa0cb9 2f3bd17 8e960a4 9cae017 ce3bc57 47ffa06 e5ae430 e59e6c7 + auth/child/progress adapters 10e351a 3c6c8a2 1a8dfe3 c105cb1): env reader, SystemClock (local date), local guest adapters (corruption-safe, 8-child limit, parity-tested against in-memory fake), Supabase auth/child/progress adapters (exact RPC args asserted, error mapping with stable auth codes), composition root `resolveMode/createDeps` (cloud vs guest). RED observations were missing-module failures only.
- T6 spot check by orchestrator: typecheck pass, lint pass, 747/747 tests pass, build pass.
- T7 (presentation foundation) is running in an isolated worktree in parallel; T8 starts after merge.

- T7 done (worktree branch merged; commits eb05ac9 4c85964 0d4a2aa 07f3258 5c889e4 af95a85 7c5200e): tokens/base/visuals CSS, i18n en/es with key-parity test, 10 atoms, 13 molecules, 14 organisms (view-model props, no application imports), domain-markup↔Sprite cross-check test. CSS not yet imported by main.tsx and NOT visually verified in a browser.
- T7 spot check by orchestrator on merged tree: typecheck pass, lint pass, 935/935 tests pass, build pass.

- User decision (explicit, after T7): TDD is OFF for the remaining work (T8, T9) and no README is to be written. Source: user message. T8 is built without tests-first; T9 reduces to typecheck/lint/test/build + Supabase advisors.

- T8 done in two parallel writers (commits eeeeffb 5309fa9 988d0e5 4adbfd6 924a7ad): providers (mode/session/child/locale), BrowserRouter with guards and lazy pages, auth/children/home/quiz/result/stickers, race and parent (gate, report, edit/delete child, sign out). Written without TDD per user decision.
- T9 (orchestrator): typecheck pass, lint pass, 984/984 tests pass, build pass (main 374 kB / 107 kB gzip). Dev server returned HTTP 200 and a headless Firefox screenshot showed the login page rendering correctly (Pip, graph-paper theme, sign in/create account/play as guest). Supabase advisors not re-run: no DB changes since T2 (clean).

## Known gaps
- No tests for quiz round, save-retry, race, parent gate, StrictMode double-save, home/stickers pages.
- Interactive flows (quiz, race, parent) never clicked through in a browser; CSS only visually checked on the login screen.
- Cloud sign-up not exercised against the real project (avoids sending confirmation emails to fake addresses); email-confirmation toggle is dashboard-only.
- No README (user request); no git remote, so no PRs.

## Next step
User runs `pnpm dev` and walks through the flows.
