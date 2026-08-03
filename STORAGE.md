# STORAGE.md — every key aiticker writes to the browser

All persistent access goes through `lib/storage.ts` (`KEYS` registry +
try/catch accessors). The `ai-index:` prefix predates the aiticker rename and
is kept so existing collectors' data survives — do not "fix" it.

## localStorage

| Key | Schema | Written by | Notes |
| --- | --- | --- | --- |
| `ai-index:binder:v1` | `Record<cardId, {copies, firstPulledAt, lastPulledAt}>` | `lib/binder.ts` | The collection. The single most precious key. |
| `ai-index:packs:v1` | `{date: "YYYY-MM-DD", used: number}` | `lib/binder.ts` | Daily pack allowance (3/day, local-midnight reset). |
| `ai-index:xp:v1` | number as string | `lib/xp.ts` | Collector XP. |
| `ai-index:achievements:v1` | `string[]` of achievement ids | `lib/achievements.ts` | Includes hidden `artifact-win-*` trophies. |
| `ai-index:battle:v1` | `{current, best, wins, losses, giantSlain?}` | `lib/battle.ts` | Arena record + streaks. |
| `ai-index:binder-visit:v1` | epoch ms as string | `components/BinderPages.tsx` | Previous visit timestamp, powers NEW tags. |
| `ai-index:community-card:v1` | `CommunityCard` JSON | `lib/create.ts` | The saved prospect card. |
| `ai-index:reroll:v1` | `{date, used}` | `lib/create.ts` | Rarity re-roll allowance (3/day). |
| `ai-index:onboarding:v1` | `{pack?, binder?, nudge?, arena?}` booleans | `lib/onboarding.ts` | First-run caption flags — each shown once ever. |
| `ai-index:storage-version` | number as string | `lib/storage.ts` | Migration cursor. v3 current. |

## sessionStorage (per-tab cache, intentionally outside `lib/storage.ts`)

| Key | Schema | Written by | Notes |
| --- | --- | --- | --- |
| `aiticker:profile:<handle>` | scored profile JSON | `lib/score.ts` | Caches public-API fetches for the session. |
| `aiticker:roast:<handle>` | roast facts JSON | `lib/score.ts` | Same, for roast facts. |

## Events (not storage, but same bus)

| Name | Purpose |
| --- | --- |
| `ai-index:store` | Same-tab change notification for `useSyncExternalStore` subscribers. |
| `ai-index:toast` | Achievement toast dispatch. |

## Removed keys (cleared by migrations v2–v3)

`ai-index:labs:v1` (draft lab) · `ai-index:tickerdle:v1` (Tickerdle) ·
`ai-index:tiers:v1` (tier lists) · `ai-index:visits:v1` (visit streaks) ·
`ai-index:votes:v1` (daily votes) ·
`ai-index:peeked:v1` (the peek system)

## Rules

- New persistent keys: add to `KEYS` in `lib/storage.ts` **and** this table.
- Never bump a key's version suffix without writing a migration in
  `runMigrations()` — user data outlives deploys.
- Storage may be unavailable (private-mode webviews). Accessors no-op/return
  fallbacks; every surface must render without stored state.
