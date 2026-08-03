# aiticker

The AI industry is a card game now. Real data. Fake money.

A live index of AI companies, engineers, and beloved useless artifacts (The
GPU, The Em Dash, The Waitlist) in collectible-card form. Rip free packs,
fill a binder, fight in the arena over a daily-rotating meta
(SHITPOSTING · AURA · LORE · …), and get your own GitHub scouted and
roasted. Prices are computed nightly from genuinely public signals —
Wikipedia attention, citations, GitHub, Hugging Face, Hacker News. No
accounts, no database, no real money in or out, ever.

Live: **https://aiticker.vercel.app** (aiticker.xyz)

## Stack

- Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS v4
- No auth, no database: static JSON + localStorage + deterministic seeded
  randomness. "Git is the database" — the nightly pipeline commits data.
- Playwright smoke suite (mobile viewport), GitHub Actions for data + e2e.

## Commands

```bash
pnpm dev          # dev server on :3000
pnpm build        # production build (also the fastest full type-check)
pnpm lint         # ESLint
pnpm test:e2e     # Playwright smoke suite (pnpm build first)
pnpm market:dry   # preview a full data-pipeline run into data/preview/
```

## Deploy

Vercel, zero config. `vercel deploy --prod` from a linked checkout, or
connect the GitHub repo in the Vercel dashboard for auto-deploys (the
nightly `market-update` workflow commits fresh data — connecting git means
prices redeploy themselves).

## Docs

- `CLAUDE.md` — project map (routes, libs, design tokens, house rules)
- `PIPELINE.md` — the nightly data pipeline
- `STORAGE.md` — every browser-storage key
- `TESTING.md` — smoke-suite coverage
- `DESIGN.md` — the Price Guide visual identity

Fan-made. Not affiliated with anyone on the index. The Wrapper card is
autobiographical.

## Anti-abuse note

A fresh profile's first two packs are deterministic per UTC day (seeded
from date + pack number), so incognito re-roll fishing yields identical
pulls and is pointless. This is the interim mitigation — real anti-abuse
(server-side pack inventory) arrives when Supabase auth is enabled; see
README-AUTH.md.
