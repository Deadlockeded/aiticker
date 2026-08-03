# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Uses **pnpm** (don't use npm/yarn).

- `pnpm dev` — dev server at :3000
- `pnpm build` — production build (also the fastest full type-check)
- `pnpm lint` — ESLint (flat config; react-hooks rules reject setState-in-effect and ref-reads-in-render — see patterns below)
- `pnpm test:e2e` — Playwright smoke suite (17 tests, mobile viewport, runs against `pnpm build`; see TESTING.md). Single test: `npx playwright test tests/smoke.spec.ts:NN`
- `pnpm market:dry` — preview a data-pipeline run into `data/preview/`

## Product in one paragraph

A collectible trading-card index of the AI industry: 50 flagship cards +
25 joke "artifact" commons + 1 secret AGI mythic (`data/cards.json`). Free
daily packs → localStorage binder → arena fights over a daily-rotating
meta → viral toys (Get Rated/roast at `/create`, ship meter). Prices are
real: a nightly GitHub Action fetches public signals and commits them.
Hard rules: **no auth, no database, no paid services, no real money or
wagering anywhere** — and quips/roasts target public personas' work only,
never appearance/family/health/identity.

## THE MAGAZINE RULE (Phase 0, 2026-08-03)

The 90s price-guide magazine identity is **visual-only**. Tokens, fonts,
paper-card/coupon/stamp motifs stay. Copy is modern and plain: no
"— The Editor" attributions, no ISSUE Nº, no in-universe bits in
functional UI (tutorials, empty states, errors, countdowns, tooltips).
Card quips, flavor text, roast/verdict lines, and stamp names (FIRST
PULL, PROOF) are the humor layer and stay. Register examples: "Next free packs in 14h." ·
"No cards yet. Rip a pack first." · "Something broke. Refresh usually
fixes it."

## Design tokens (DESIGN.md)

Cream `#F2EDE3` bg · paper `#FDFBF6` · ink `#1E2430` · secondary
`#5A6070` · muted `#9AA0AC` · accent red `#C23B2E` (hover `#A32F24`) ·
green `#1F7A3D`. Fonts via next/font vars: Archivo Black
(`--font-display`), Oswald (mapped over `--font-geist-mono` — every
`font-mono` class renders Oswald), Lora (over `--font-geist-sans`).
Tailwind v4: no config file — tokens in `app/globals.css` `@theme`.
Motifs: `.paper-card`/`.paper-shadow` (5px offset ink), `.coupon`
(dashed), rotated ink stamps.

## Data flow

`data/cards.json` → `lib/cards.ts` enriches at module load into
`MarketCard` (rating from `lib/rating.ts`, price-history fallback from
`lib/market.ts`). Pages import from `lib/cards.ts`, never the JSON.
Nightly: `.github/workflows/market-update.yml` → `scripts/update-market.ts`
→ 5 keyless sources → signals → rating recompute → price append (±10%
clamp) → git commit. See PIPELINE.md. Never zero a stat on fetch failure.

## lib/ map

- `rng.ts` — THE seeded-randomness toolkit (fnvHash + mulberry32). Never copy these into feature libs.
- `storage.ts` — THE localStorage gateway: `KEYS` registry, try/catch accessors, versioned migration. Every new persistent key goes here + STORAGE.md.
- `binder.ts` — collection, pack allowance, and the shared store bus (`notifyStore`/`subscribeStore`).
- `meta.ts` — the Daily Meta: 10 fight categories with documented formulas; 4 active per UTC day; per-card ±8 seed wobble (values fixed, not random).
- `vsMapping.ts` — arena resolution: 3 rounds drawn from today's active 4 (pairing-hash pick), AGI coin-flips, chaos upsets, `decisiveCategory` for share text.
- `daily.ts` — all date-hash picks: hot cards (+3 boost), featured card, quips of the day.
- `market.ts` — prices (committed history wins; deterministic simulation as pre-pipeline fallback), `formatTicks` (₮).
- `economy.ts` — pack cadence: 1 pack per 8h rolling, bank cap 2 (constants only).
- `packs.ts`/`editions.ts` — odds (`CATEGORY_ODDS`: agi 0.1%, artifacts 35%…), serials. `pullPackFor` seeds a fresh profile's first two packs from (UTC date + pack number) — incognito fishing gets identical pulls; interim until Supabase server-side inventory (README-AUTH.md).
- `score.ts` — client-side GitHub/HF/HN scoring for Get Rated (sessionStorage cache), `getRoastFacts`. NO LinkedIn, ever.
- `lines.ts` — ALL joke copy: roast lines, verdicts, stamps, stat tiers/definitions.
- `share.ts` — Web Share API w/ files + download fallback, `brandFonts()` for canvas exports.
- `onboarding.ts` — first-run caption flags (~6 one-liners, each shown once).
- `create.ts`, `xp.ts`, `achievements.ts`, `battle.ts`, `shipmeter.ts` — prospect cards, XP, trophies, arena record, ship meter.

## Ownership / visibility rules (the print-proof system)

ALL cards are face-up everywhere, always — the index is public, every
word (name, stats, quips, price) stays crisp. Mystery lives ONLY inside
the pack rip. Ownership is expressed through the ART: unowned cards
render their art as a coarse halftone PRINT PROOF (single-ink navy,
rotated dot screen via `--dot` CSS var scaled per size, PROOF watermark,
"NOT IN YOUR BINDER" tag, no foil/tilt, flat shadow) — `proof` prop on
`TradingCard`, ownership via `useOwnedSet()`. Pulling a new card =
`resolving` prop: the veil's dots shrink away into full color, then foil
(THE pull beat, in `PackRipper`). FIRST PULL stamp stays. Card backs
(`CardBackFace`, anonymous) exist only as the pack pre-flip state. No
gaussian blur anywhere. Unowned detail pages show tier odds + a RIP
PACKS CTA; owned show binder actions.

## House patterns (the lint config enforces these)

- Date/localStorage/media reads: `useSyncExternalStore` with a null/false
  server snapshot — never setState-in-effect hydration reads. Same-tab
  sync via the store bus in `binder.ts`. SSG pages must never bake in a
  date-derived pick (hydration mismatch + stale cache).
- `getSnapshot` must return stable/cached values (see `getDailyMeta`'s
  per-day cache; capture-once module snapshots in BinderPages/onboarding).
- Deferred setState in effects: `setTimeout(…, 0)`.
- localStorage keys keep the legacy `ai-index:` prefix (user data
  predates the aiticker rename). All access via `lib/storage.ts`.
- Canvas share exports: await `brandFonts()`, use design tokens,
  watermark `aiticker.xyz`, slice long strings; OG routes are 1200×630
  and satori's default font has no ₮/emoji (spell out TICKS, use
  monograms).
- Card art: remote royalty-free (Wikimedia portraits, Google favicon
  service); allowed hosts in next.config.ts; `image: null` → monogram.

## Routes

`/` (masthead + featured + hot list + gallery deck/grid) · `/market`
(price table) · `/cards/[id]` (SSG detail: hero card w/ proof-or-owned,
chart, stats, TODAY'S FORM, signals) · `/packs` · `/binder`
(9-pocket pages, trade-in) · `/arena` (meta strip,
CHALLENGER LINE swipe deck, fights) · `/create` (Get Rated + SCOUT'S
ROAST; manual mode) · `/shipmeter` · `/howto` · `/about` · OG routes
under `/api/og/*`. Redirects from all removed features live in
next.config.ts. Shelved Series 2 (moments/rivalries) in `data/series2/`;
benched cards in `data/bench/`.
