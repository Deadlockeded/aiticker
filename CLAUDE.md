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
33 joke "artifact" commons + 1 secret AGI mythic (`data/cards.json`). Free
daily packs → localStorage binder → arena fights over a daily-rotating
meta → viral toys (Get Rated/roast at `/create`, ship meter). Prices are
real: a nightly GitHub Action fetches public signals and commits them.
Hard rules: **no auth, no database, no paid services, no real money or
wagering anywhere** (Ticks are earned by playing and spent only on packs —
never staked, never purchasable; the funding satire never attaches a
fabricated round, amount, or valuation to a real company or person) — and
quips/roasts target public personas' work only, never appearance / family /
health / identity.

## THE MAGAZINE RULE (Phase 0, 2026-08-03)

The 90s price-guide magazine identity is **visual-only**. Tokens, fonts,
paper-card/coupon/stamp motifs stay. Copy is modern and plain: no
"— The Editor" attributions, no ISSUE Nº, no in-universe bits in
functional UI (tutorials, empty states, errors, countdowns, tooltips).
Card quips, flavor text, roast/verdict lines, and stamp names (FIRST
PULL, PROOF) are the humor layer and stay. Register examples: "Next free packs in 14h." ·
"No cards yet. Rip a pack first." · "Something broke. Refresh usually
fixes it."

## Design System v1 (DESIGN-SYSTEM.md)

Tokens live in `app/globals.css` as CSS variables for BOTH modes and are
mirrored as data in `lib/tokens.ts` for the canvas/OG renderers and the
contrast gate. Screens consume tokens only (`bg-surface`, `text-ink2`,
`border-line`) — never raw hex.

- Modes: system preference wins; NO preference defaults to dark. The manual
  toggle persists and is applied by an inline boot script before paint.
- **GRADIENT LICENCE**: gradients appear only on sealed pack wrappers, rare+
  foil material, and the mid-rip drain. Chrome/buttons/text/borders are flat.
- **CONTRAST CONTRACT**: `tests/unit/contrast.test.ts` asserts WCAG AA on both
  modes and fails the build. Six mandated pairs cannot reach 4.5:1 with the
  fixed tokens and are held at 3:1 with usage rules recorded in `lib/tokens.ts`
  — text on an accent fill is ≥16px/600, accent-on-tint is a micro-cap chip.
  Dark teal and dark amber carry `onAccentInk`, not white.
- Type: Sora (display) · Instrument Sans (body, 15px/1.6) · Martian Mono (data
  and `.micro` labels at 8.5px letterspaced). No other fonts, ever, including
  canvas.
- Components: `components/ui.tsx` is the single source — pill buttons, chips,
  the segmented control, stat tiles, entity tints. Do not fork them locally.
- Logo: `components/Logo.tsx` is THE FAN (pink tile, three cards from one
  pivot, grade tick ≥48px, `fallen` for error pages). Icons regenerate from it.

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
- `meta.ts` — the Daily Meta: 22 fight categories with documented formulas; 4 active per UTC day; per-card ±8 seed wobble (values fixed, not random). Adding a category means a case in BOTH switches, an entry in `profileMetaValues`, and a WATCH line.
- `vsMapping.ts` — arena resolution: 3 rounds drawn from today's active 4 (pairing-hash pick), AGI coin-flips, chaos upsets, `decisiveCategory` for share text.
- `daily.ts` — all date-hash picks: hot cards (+3 boost), featured card, quips of the day.
- `market.ts` — prices (committed history wins; deterministic simulation as pre-pipeline fallback), `formatTicks` (₮).
- `economy.ts` — pack cadence (1 pack per 8h rolling, bank cap 2) plus THE TICK ECONOMY: exchange-pack price, purse constants, and the pure `computePurse` math. The hard rules live in its header comment — no wagering ever, no real money, earned packs capped by `EARN_DAILY_CAP`. Earn-rate table in ECONOMY.md.
- `wallet.ts` — THE Tick gateway: balance, capped `grantTicks`, `spendTicks`, dupe sales, the `+₮n` toast event. Ticks buy exactly one thing: the ₮500 Exchange Pack.
- `royalties.ts` — ARTIFACT ROYALTIES: the editorial keyword map (every artifact), the pure trigger matcher the nightly script runs over HN/GH/wiki signals, the triple-capped claim math (3 copies, ₮60/day, folds into `EARN_DAILY_CAP`), and THE FUND set bonus. Triggers live in `data/royalties.json`, committed nightly like prices.
- `rituals.ts` — the two claimable grants: daily visit (₮50, fired at boot) and RAISE A ROUND (₮300 per ISO week, deterministic fictional investor + terms from `lines.ts`).
- `toast.ts` — the toast bus, split out so `xp.ts` can fire level-ups without an import cycle through `achievements.ts`.
- `xp.ts` — XP levels dressed as FUNDING STAGES (Garage → … → Acquired (Derogatory)). Thresholds never changed with the rename; only the labels did.
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

`/` (masthead + featured + weekly round + hot list + gallery deck/grid) · `/market`
(price table) · `/cards/[id]` (SSG detail: hero card w/ proof-or-owned,
chart, stats, TODAY'S FORM, signals) · `/packs` · `/binder`
(9-pocket pages, trade-in) · `/arena` (meta strip,
CHALLENGER LINE swipe deck, fights) · `/create` (Get Rated + SCOUT'S
ROAST; manual mode) · `/shipmeter` · `/howto` · `/about` · OG routes
under `/api/og/*`. Redirects from all removed features live in
next.config.ts. Shelved Series 2 (moments/rivalries) in `data/series2/`;
benched cards in `data/bench/`.
