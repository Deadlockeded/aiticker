# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Uses **pnpm** (see pnpm-lock.yaml — don't use npm/yarn).

- `pnpm dev` — start dev server at http://localhost:3000
- `pnpm build` — production build (also the fastest full type-check)
- `pnpm lint` — ESLint (flat config, eslint-config-next)

There is no test runner configured.

## Architecture

Next.js App Router app (Next 16, React 19, TypeScript strict, Tailwind CSS v4) — a collectible trading-card index of AI companies and AI engineers.

- `lib/types.ts` — the `Card` type. `priceHistory: PricePoint[]` is intentionally an empty array on all seed data: the data model is pre-wired for a future Football-Index-style price mechanic, but no trading/pricing features exist yet. Keep new features compatible with that plan.
- `data/cards.json` — all card data lives here as a static JSON seed (imported directly; `resolveJsonModule` is on). No database, no API routes. Card `image` URLs are remote and royalty-free: Wikimedia Commons thumbs for engineers, Google's favicon service for company logos (allowed hosts in next.config.ts); `image: null` falls back to the monogram via `components/CardArt.tsx`.
- `lib/cards.ts` — typed accessors over the seed data (`getAllCards`, `getCard`), plus derived rank (cards sorted by `stats.rating`). Rank is computed, never stored.
- `components/TradingCard.tsx` — the hero visual. All rarity-based styling (foil/gradient/shine per rarity tier) is driven by a `RARITY` config map in this file; add new tiers there, not with ad-hoc classes. Foil/shine keyframes live in `app/globals.css`.
- `app/page.tsx` renders the grid; sorting/filtering is client-side in `components/CardGrid.tsx`.
- `app/cards/[id]/page.tsx` — card detail, statically generated via `generateStaticParams` over the JSON. It reserves a placeholder panel for the future price chart.

Tailwind v4 note: there is no tailwind.config — theme tokens are declared in `app/globals.css` via `@theme inline`.
