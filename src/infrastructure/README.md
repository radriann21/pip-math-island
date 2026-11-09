# Infrastructure

Adapters that implement the application ports (`src/application/ports`). This layer may import `application`
and `domain` only; the composition root (`src/app/container.ts`) is the only place that wires it to the UI.

```
supabase/   cloud mode: parent accounts and data in Postgres (RLS)
local/      guest mode: everything in localStorage on this device
system/     SystemClock (local calendar date, epoch ms)
coerce.ts   defensive coercion shared by both modes (grade 1..6, stars 0..3, tier 0..2, locale, topic ids)
```

## Adapters

| Port | Cloud (`supabase/`) | Guest (`local/`) |
| --- | --- | --- |
| `AuthGateway` | `SupabaseAuthGateway` (e-mail + password, `emailRedirectTo`, `onAuthStateChange`) | `LocalAuthGateway` (guest flag only; sign up/in throw `AuthError('cloud_unavailable')`) |
| `ChildRepository` | `SupabaseChildRepository` (`children`, `parent_id` from the session user) | `LocalChildRepository` (`pip.v2.children`, max 8) |
| `ProgressRepository` | `SupabaseProgressRepository` (reads 4 tables in parallel, writes through `record_round` / `record_race`) | `LocalProgressRepository` (`pip.v2.progress.<childId>`, history capped at 50) |
| `Clock` | `system/SystemClock` | same |

Both progress adapters apply a saved round with the same rules: the SQL functions in the cloud, and
`application/projection.ts` (`applyRound` / `applyRace`) locally.

`supabase/database.types.ts` is generated; never edit it by hand. The client is `SupabaseClient<Database>`, so a
table or column that is not in the schema fails to compile. Tests use `supabase/testing/fakeSupabase.ts`
(no network).

## Error mapping

Adapters never leak vendor errors. The original error is kept in `cause`; `message` is a fixed, user-safe text.

| Source | Result |
| --- | --- |
| Postgres `42501` (RLS / "child not found" from the RPCs) | `NotFoundError` when a resource is named, otherwise `AuthError('not_allowed')` |
| `PGRST301`, `PGRST303` (JWT missing or expired) | `AuthError('session_expired')` |
| `23514` check violation, `23502`, any `22xxx` | `ValidationError('Invalid data')`; the 8-children trigger gets its own readable message |
| `23505` unique violation | `ValidationError('Already exists')` |
| `23503` foreign key, `PGRST116` (no row) | `NotFoundError` |
| Network failures (`Failed to fetch`, `AuthRetryableFetchError`) | `StorageError('Network unavailable')` |
| Anything else | `StorageError` |
| Auth: `invalid_credentials`, `email_not_confirmed`, `email_taken`, `weak_password`, `rate_limited`, `signup_disabled` | `AuthError` whose message is that stable code |
| Auth: validation codes | `ValidationError`; unknown codes become `AuthError('auth_failed')` |
| Local storage write refused (quota, private mode) | `StorageError`; corrupt or missing JSON never throws, it falls back to defaults |

## Guest / cloud switch

`resolveMode({ env, storage })` returns `'cloud'` only when `VITE_SUPABASE_URL` (http/https) and
`VITE_SUPABASE_PUBLISHABLE_KEY` are both set and `localStorage['pip.v2.mode']` is not `'guest'`. "Continue as
guest" sets that flag (`LocalAuthGateway.continueAsGuest` or `setPreferredMode(storage, 'guest')`); signing out of
guest mode clears it. `createDeps` builds the matching `Deps`, and keeps a single Supabase client so only one
auth listener exists. Guest data is not migrated to the cloud.
