# Pip's Math Island — Architecture

Educational math game for primary school (grades 1–6). Parents sign in with Supabase Auth, create child
profiles, and each child's progress, stars, stickers and streaks persist in Postgres. A guest mode keeps
everything in `localStorage` when no account (or no Supabase config) is available.

The original single-file prototype lives in `prototype/` and is the **behavioural reference** for exercise
generators, visuals, copy and CSS. Port it faithfully; do not redesign it.

## Stack

- Vite + React 18 + TypeScript (`strict`, `noUncheckedIndexedAccess`), ESM only.
- Vitest + @testing-library/react + jsdom. Package manager: **pnpm**, exact versions (`pnpm add -E`), lockfile committed.
- `@supabase/supabase-js` (browser client, publishable key only), `react-router-dom`.
- Plain CSS (design tokens as CSS custom properties, ported from `prototype/index.html`). No CSS framework.

## Layers (hexagonal) and the dependency rule

```
presentation  ──►  application  ──►  domain
infrastructure ──►  application  ──►  domain      (infrastructure implements application ports)
```

- `domain` imports nothing from other layers, nothing from React, nothing from the DOM, nothing from Supabase.
- `application` imports only `domain`. It defines **ports** (interfaces) and **use cases** (plain functions/classes).
- `infrastructure` implements ports (Supabase adapters, localStorage adapter). May import `application` + `domain`.
- `presentation` (React) talks to use cases through the composition root (`src/app/container.ts`) exposed by a
  React context. It never imports `infrastructure` directly except through `src/app`.
- Enforce with an ESLint `no-restricted-imports` rule per layer.

```
src/
  domain/
    shared/            rng.ts (Rng = () => number, seeded rng for tests), locale.ts, types.ts
    exercises/         one file per topic generator + markup.ts + visuals/ + registry.ts + index.ts
    progression/       stars.ts, tiers.ts, xp.ts, streak.ts, badges.ts, race.ts, round.ts, index.ts
  application/
    ports/             AuthGateway.ts, ChildRepository.ts, ProgressRepository.ts, Clock.ts, index.ts
    usecases/          one file per use case + index.ts
    testing/           in-memory fakes of every port (used by tests)
  infrastructure/
    supabase/          client.ts, SupabaseAuthGateway.ts, SupabaseChildRepository.ts, SupabaseProgressRepository.ts, mappers.ts, database.types.ts
    local/             LocalAuthGateway.ts (guest), LocalChildRepository.ts, LocalProgressRepository.ts
    system/            SystemClock.ts
  app/                 container.ts (composition root), AppProviders.tsx, router.tsx, main.tsx
  presentation/
    i18n/              en.ts, es.ts, I18nProvider.tsx, useI18n.ts
    styles/            tokens.css, base.css, (one css file per component group)
    atoms/ molecules/ organisms/ templates/ pages/     (atomic design)
    containers/        stateful wrappers that call use cases and render presentational components
```

Container/presentational rule: components in `atoms|molecules|organisms|templates` are **pure presentational**
(props in, callbacks out, no use-case calls, no router hooks). `containers/*` and `pages/*` own state and effects.

## Domain contract

All writers must use these exact names (additive changes allowed, renames are not).

```ts
export type Locale = 'en' | 'es';
export type Grade = 1 | 2 | 3 | 4 | 5 | 6;
export type Tier = 0 | 1 | 2;
export type Stars = 0 | 1 | 2 | 3;
export type TopicId = 'count'|'add'|'sub'|'mul'|'div'|'frac'|'place'|'time'|'money'|'geo'|'pattern'|'word';
export type Rng = () => number; // [0,1)

export interface GenContext { grade: Grade; tier: Tier; locale: Locale; rng: Rng }

export interface Question {
  topic: TopicId;
  kind: 'choice' | 'num';
  prompt: string;          // rich text: plain text + trusted markup built by markup.ts (fractions, boxes). Never user input.
  vis: string;             // trusted SVG/HTML markup built by exercises/visuals (may be '')
  hint: string;
  why: string;
  answer: string | number; // choice -> the exact label string in opts; num -> finite number
  opts?: string[];         // choice only; 2..4 unique labels, includes answer
  decimal: boolean;        // num only: whether the keypad shows a decimal key
}
export interface TopicDefinition { id: TopicId; accent: string; title: Record<Locale,string>; generate(ctx: GenContext): Question }
export function checkAnswer(q: Question, input: string): boolean;   // comma or dot decimals; tolerance 1e-6
export function generateRound(topic: TopicId, grade: Grade, tier: Tier, locale: Locale, rng: Rng, size?: number): Question[]; // default 10, dedupes prompts, first 3 questions use max(0,tier-1)
export function generateRaceQuestion(grade: Grade, locale: Locale, rng: Rng): { prompt: string; answer: string; opts: string[] };
```

Progression (pure functions, all unit-tested):

```ts
export interface AnswerDetail { index: number; prompt: string; correct: boolean; tries: 1 | 2 }  // tries=2 and correct=false means missed
export interface RoundOutcome { topic: TopicId; grade: Grade; tierBefore: Tier; firstTry: number; secondTry: number; missed: number; bestCombo: number; details: AnswerDetail[] }
export interface RoundScore { stars: Stars; tierAfter: Tier; xpGained: number; perfect: boolean }
export function scoreRound(o: RoundOutcome): RoundScore;
// stars: score = firstTry + 0.5*secondTry ; >=9 ->3, >=7 ->2, >=5 ->1 else 0
// tier: firstTry>=9 -> min(2,t+1); firstTry<=4 -> max(0,t-1); else t
// xp per answer: first try -> 10 + min(comboAtThatPoint,5); second try -> 5; miss -> 0
export function levelInfo(xp: number): { level: number; pct: number; next: number };   // level = 1+floor(sqrt(xp/60))
export function nextStreak(prev: { streak: number; lastPlayed: string | null }, today: string): { streak: number; lastPlayed: string }; // ISO yyyy-mm-dd, consecutive day +1, same day unchanged, else 1
export const DAILY_GOAL_ROUNDS = 3; export const DAILY_BONUS_XP = 30;
export interface PlayerSnapshot { xp: number; streak: number; roundsTotal: number; totalStars: number; topicsTried: number; hasMaster: boolean; raceBest: number; perfectRound: boolean; bestCombo: number }
export interface BadgeDefinition { id: string; glyph: 'star'|'flame'|'bolt'|'crown'|'heart'|'medal'; color: string; title: Record<Locale,string>; description: Record<Locale,string>; isEarned(s: PlayerSnapshot): boolean }
export const BADGES: readonly BadgeDefinition[];   // same 12 badges as the prototype
export function newlyEarned(owned: ReadonlySet<string>, s: PlayerSnapshot): BadgeDefinition[];
```

## Application contract

```ts
export interface Child { id: string; name: string; grade: Grade; locale: Locale; soundEnabled: boolean }
export interface TopicProgress { tier: Tier; bestStars: Stars; answered: number; correct: number }
export interface DailyActivity { day: string; rounds: number; bonusClaimed: boolean }
export interface PlayerState {
  child: Child; xp: number; streak: number; lastPlayed: string | null; roundsTotal: number; raceBest: number;
  progress: Record<string /* `${grade}:${topic}` */, TopicProgress>;
  badges: string[]; today: DailyActivity;
}
export interface Session { userId: string; email: string | null; guest: boolean }

interface AuthGateway { getSession(): Promise<Session|null>; signUp(email,password): Promise<{session: Session|null; needsEmailConfirmation: boolean}>; signIn(email,password): Promise<Session>; signOut(): Promise<void>; continueAsGuest(): Promise<Session>; onChange(cb:(s:Session|null)=>void): () => void }
interface ChildRepository { list(): Promise<Child[]>; create(input: Omit<Child,'id'>): Promise<Child>; update(id: string, patch: Partial<Omit<Child,'id'>>): Promise<Child>; remove(id: string): Promise<void> }
interface ProgressRepository { load(childId: string): Promise<PlayerState>; saveRound(childId: string, r: SavedRound): Promise<PlayerState>; saveRace(childId: string, r: SavedRace): Promise<PlayerState>; history(childId: string, limit?: number): Promise<RoundHistoryItem[]> }
interface Clock { today(): string /* local ISO date */; now(): number }
```

`SavedRound` carries everything already computed by the domain (outcome, score, new streak/day values, bonus flag, new badge ids)
so adapters only persist; the Supabase adapter does it in **one RPC call** (`record_round`).
Use cases (each one file, each unit-tested with the in-memory fakes): `signUp, signIn, signOut, continueAsGuest, getSession,
listChildren, createChild, updateChild, removeChild, loadPlayer, startRound, finishRound, startRace, finishRace, getParentReport`.

## Database (Supabase project `educative-project`)

Schema lives in `supabase/migrations/*.sql` and is already applied remotely. Tables (all in `public`, RLS on, owner = parent):
`children`, `topic_progress`, `rounds`, `child_badges`, `race_scores`, `daily_activity`. RPCs (SECURITY INVOKER):
`record_round(...)`, `record_race(...)`. Typed client types: `src/infrastructure/supabase/database.types.ts`
(generated, never hand-edited). Only the **publishable** key is used in the browser; `.env.local` holds
`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. If either is missing the app runs in guest/local mode.

## Conventions

- TDD is mandatory: write the failing test, watch it fail, implement, watch it pass, refactor.
- Conventional Commits, one work unit per commit, tests + docs with the behaviour. **No AI attribution lines.**
- UI copy, identifiers and comments are English; every user-facing string also has a Spanish translation (`es`).
- Accessibility: real buttons, visible focus, aria labels on SVG, `prefers-reduced-motion`, keyboard support (1–4 choose, Enter, digits).
- Child privacy: store only a first name or nickname (max 24 chars), grade, locale. No analytics, no third-party scripts.
