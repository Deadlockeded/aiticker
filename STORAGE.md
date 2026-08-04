# STORAGE.md — every key aiticker writes to the browser

All persistent access goes through `lib/storage.ts` (`KEYS` registry +
try/catch accessors). The `ai-index:` prefix predates the aiticker rename and
is kept so existing collectors' data survives — do not "fix" it.

## localStorage

| Key | Schema | Written by | Notes |
| --- | --- | --- | --- |
| `ai-index:binder:v1` | `Record<cardId, {copies, firstPulledAt, lastPulledAt, prints?}>` | `lib/binder.ts` | The collection. The single most precious key. |
| `ai-index:packs:v1` | `{bank, ts, ripped}` | `lib/binder.ts` | Pack bank: 1 accrues per 8h (rolling), cap 2; `ripped` = lifetime rips (feeds the deterministic first-pack path). Legacy `{date, used}` converts in place. |
| `ai-index:xp:v1` | number as string | `lib/xp.ts` | Collector XP. |
| `ai-index:achievements:v1` | `string[]` of achievement ids | `lib/achievements.ts` | Includes hidden `artifact-win-*` trophies. |
| `ai-index:battle:v1` | `{current, best, wins, losses, giantSlain?, winDay?}` | `lib/battle.ts` | Arena record + streaks. `winDay` is the UTC day of the last win, which drives the first-win-of-day purse. |
| `ai-index:wallet:v1` | `{bal, day, earned}` | `lib/wallet.ts` | Tick balance. `earned` is today's capped income and resets on UTC rollover; the cap is `EARN_DAILY_CAP`. Fresh wallets open at ₮100. |
| `ai-index:rituals:v1` | `{visit?: dayKey, round?: weekKey}` | `lib/rituals.ts` | Idempotency stamps for the daily visit stipend and RAISE A ROUND. |
| `ai-index:royalties:v1` | `string[]` of claimed trigger dates | `lib/royalties.ts` | Rolling 60; synced (union) via the Supabase blob so claims never double. |
| `ai-index:roasts:v1` | `{day: dayKey, used: number}` | `lib/roasts.ts` | Daily roast quota (5 free/UTC day). Burn links never spend it. |
| `ai-index:custody:v1` | `{prompted, nudged: {rare, returning}}` | `lib/custody.ts` | Custody Desk prompt memory: sheet once, two nudges ever. Absorbs legacy `ai-index:sync-nudge:v1`. |
| `ai-index:gh-handle:v1` | `string` | `lib/custody.ts` | GitHub username captured at sign-in; prefills handle inputs (editable). |
| `ai-index:synced-at:v1` | epoch ms string | `lib/custody.ts` | Last successful cloud push — the "synced 2m ago" menu label. |
| `ai-index:cap-table:v1` | `{week, investor, amount}[]` (max 10) | `lib/rituals.ts` | The fictional cap table — past claimed rounds, newest last. |
| `ai-index:binder-visit:v1` | epoch ms as string | `components/BinderPages.tsx` | Previous visit timestamp, powers NEW tags. |
| `ai-index:community-card:v1` | `CommunityCard` JSON | `lib/create.ts` | The saved prospect card. |
| `ai-index:reroll:v1` | `{date, used}` | `lib/create.ts` | Rarity re-roll allowance (3/day). |
| `ai-index:onboarding:v1` | `{pack?, binder?, nudge?, arena?}` booleans | `lib/onboarding.ts` | First-run caption flags — each shown once ever. |
| `ai-index:storage-version` | number as string | `lib/storage.ts` | Migration cursor. v3 current. |
| `ai-index:sync-nudge:v1` | "1" when dismissed | `components/SyncNudge.tsx` | One-time save-progress nudge. |

## sessionStorage (per-tab cache, intentionally outside `lib/storage.ts`)

| Key | Schema | Written by | Notes |
| --- | --- | --- | --- |
| `aiticker:profile:<handle>` | scored profile JSON | `lib/score.ts` | Caches public-API fetches for the session. |
| `aiticker:roast:<handle>` | roast facts JSON | `lib/score.ts` | Same, for roast facts. |

## Events (not storage, but same bus)

| Name | Purpose |
| --- | --- |
| `ai-index:store` | Same-tab change notification for `useSyncExternalStore` subscribers. |
| `ai-index:toast` | Achievement and level-up toast dispatch (`lib/toast.ts`). |
| `ai-index:ticks` | +₮n grant toast dispatch (`lib/wallet.ts`). |

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
