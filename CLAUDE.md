# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Uses **pnpm** (see pnpm-lock.yaml — don't use npm/yarn).

- `pnpm dev` — start dev server at http://localhost:3000
- `pnpm build` — production build (also the fastest full type-check)
- `pnpm lint` — ESLint (flat config, eslint-config-next)

There is no test runner configured.

## Data pipeline

The market is real: a GitHub Actions cron (`.github/workflows/market-update.yml`) runs `scripts/update-market.ts` daily — free public APIs → signals → ratings → a price point appended per card → committed JSON → Vercel redeploy. See PIPELINE.md for sources, failure model, tuning constants, and how to add a card. `pnpm market:dry` previews a full run into `data/preview/`. Never zero a stat on fetch failure; manual metrics (valuation, funding, …) are hand-edited only.

## Architecture

Next.js App Router app (Next 16, React 19, TypeScript strict, Tailwind CSS v4) — a collectible trading-card index of AI companies and AI engineers with a fully simulated market. Ship-fast constraints are deliberate: **no auth, no database, no external APIs, no chart/animation libraries** — static JSON + localStorage + deterministic simulation, deployable to Vercel as-is.

Data flow: `data/cards.json` (seed) → `lib/cards.ts` enriches each card at module load into a `MarketCard` (computed `rating` from `lib/rating.ts`, 30-day `priceHistory` from `lib/market.ts`). Pages import from `lib/cards.ts`, never the JSON directly.

- `lib/rating.ts` — FIFA-style 0–99 rating from raw `card.metrics`. All tuning lives in the exported `RATING_CONFIG` (weights, log/linear curves per metric, floor/ceil). Runtime overwrites the legacy `stats.rating`; `MarketCard.rating` is the source of truth.
- `lib/market.ts` — deterministic simulation: mulberry32 PRNG seeded from the card id, so server and client always generate identical prices (hydration-safe). Prices depend only on the PRNG, never on dates; timestamps are only ever rendered client-side (tooltips). Keep it that way.
- `lib/binder.ts` / `lib/packs.ts` — localStorage collection + daily pack allowance (3/day, local-midnight reset) and odds-weighted pulls (`PULL_ODDS` in `lib/editions.ts`). Client-only: call post-mount. Pack pulls are true-random on purpose (click handlers only).
- `data/cards.json` — static seed. Card `image` URLs are royalty-free remotes (Wikimedia Commons portraits, Google favicon service for logos; allowed hosts in next.config.ts); `image: null` falls back to the monogram via `components/CardArt.tsx`.
- `components/TradingCard.tsx` — the hero visual. All rarity-based styling (foil/gradient/shine per tier) is driven by the `RARITY` config map in this file; add new tiers there, not with ad-hoc classes. Keyframes (foil, pack rip, confetti) live in `app/globals.css`.
- `components/PackRipper.tsx` — pack-opening state machine (idle → ripping → reveal) with CSS-only ritual animations.
- `app/api/og/[id]/route.tsx` — edge route rendering 1200×630 share images via `next/og`. Satori's default font lacks the ₮ glyph — spell out "TICKS" there.
- Pages: `/` grid (+ hero CTA), `/market` (movers + sortable table), `/cards/[id]` (SSG detail + SVG price chart), `/packs`, `/binder`, `/leaderboard` (fake rivals + real binder value).

Fun layer (game features — a game, not a market; never add buy/sell/invest language or real-money anything):

- Card kinds now include `moment` and `rivalry` (custom art frames in TradingCard; RivalryArt is the tap-to-flip client piece). `scripts/seed.ts` regenerates the base roster; moments/rivalries were appended by one-off scripts.
- `lib/daily.ts` — ALL date-driven picks (daily card, prediction, hot cards) hash the UTC day. Date-dependent UI must render client-side only (post-mount / `useSyncExternalStore` with a null server snapshot) because pages are SSG'd; never bake a date into server HTML.
- `lib/xp.ts`, `lib/achievements.ts`, `lib/battle.ts`, `lib/lab.ts` — all state is localStorage keyed `ai-index:*:v1`, synced across components via the shared store event in `lib/binder.ts` (`notifyStore`/`subscribeStore`). New localStorage features must use that pattern — the repo's lint config rejects setState-in-effect hydration reads.
- `/arena` (Battle+Versus merged: binder fighter vs index card or scored GitHub handle; /battle and /vs redirect there). Lab/Today/grading/Free-Agent were removed in the 2026-08-03 identity restructure; moments/rivalries are shelved in `data/series2/` (see SERIES2.md). Viral toys: `/create` (Get Rated + stamps), `/roast`, `/shipmeter` — all client-side fetches of public APIs, all joke copy in `lib/lines.ts`.

Tailwind v4 note: there is no tailwind.config — theme tokens are declared in `app/globals.css` via `@theme inline`. Design language: near-black neutrals, single cyan accent, sentence-case headers, `tnum` class for tabular numerals — keep new UI inside this system.
