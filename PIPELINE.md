# AI Ticker data pipeline

Real market data at $0/month. **Git is the database**: a GitHub Actions cron
fetches free public APIs daily, recomputes ratings, appends a price point per
card, and commits the JSON. Vercel redeploys on push, so the site is always a
static snapshot of the latest commit. No servers, no databases, no paid APIs.

```
GitHub Actions (02:00 UTC daily)
  └─ scripts/update-market.ts
       ├─ scripts/sources/wikipedia.ts    Wikimedia Pageviews  (keyless)
       ├─ scripts/sources/openalex.ts     OpenAlex authors     (keyless + mailto)
       ├─ scripts/sources/github.ts       GitHub REST          (GITHUB_TOKEN, automatic)
       ├─ scripts/sources/huggingface.ts  HF Hub API           (keyless)
       └─ scripts/sources/hackernews.ts   Algolia HN Search    (keyless)
  └─ commit data/cards.json + data/market-meta.json  ("market: daily update YYYY-MM-DD")
  └─ Vercel auto-deploys the push
```

## What each source produces

| Source | Card ids used | Signals |
| --- | --- | --- |
| Wikimedia Pageviews | `wikipediaSlug` | `attention7d` (sum of last 7 days), `attentionDelta` (% vs prior 7) |
| OpenAlex | `openalexId` (engineers) | `citations`, `hIndex`, `works` |
| GitHub | `githubOrg` / `githubUser` | `stars` (top-10 repos), `ghFollowers` |
| Hugging Face | `hfOrg` | `hfDownloads30d`, `hfLikes` |
| Hacker News | (card name, quoted) | `hnMentions7d` |

Signals land in `card.signals`. **Manual stats** (`metrics.valuation`,
`metrics.funding`, `metrics.headcount`, `impactScore`, …) are never touched by
the pipeline — edit them by hand in `data/cards.json`.

## Failure model

Every source call has a 10s timeout and its own try/catch. A failing source
**keeps the card's last known signal values** — nothing is ever zeroed. Calls
run sequentially with a 200ms gap (politeness beats runtime; the cron doesn't
care). Per-source success/fail counts land in `data/market-meta.json`.

## Ratings and prices

- Rating: `lib/rating.ts` `buildRatingContext(cards)` — base metrics weights
  plus `SIGNAL_CONFIG` (attention, HN buzz, stars, HF downloads, h-index).
  Signal weights renormalize against what a card actually has, so a card with
  no ids keeps exactly its metric-only rating. Frontend and pipeline share
  this code, so displayed ratings always match committed ones.
- Price: `new = prev × (1 + 1.5×ratingΔ% + 0.08×attentionΔ)`, hard-clamped to
  ±10%/day, appended as `{timestamp, price}`; history capped at 365 points.
  Pre-pipeline points carry `simulated: true` and render faded in charts.
- Hot Streak cards = top 2 by `attentionDelta` (falls back to the date-hash
  pick until the first pipeline run).

## Running it

```bash
pnpm market:dry      # full fetch, writes data/preview/, prints old→new table
pnpm market:update   # writes data/ in place (what the cron runs)
```

The Action also supports manual runs: GitHub → Actions → "Market update" →
Run workflow.

## Adding a new card

1. Add the card to `data/cards.json` with `metrics`, `flavorText`, rarity,
   serial (`scripts/seed.ts` shows the shape; `priceHistory: []` is fine —
   the next run backfills it).
2. Look up its ids (all optional — skip any that don't exist):
   - `wikipediaSlug`: the exact article title with underscores (follow the
     redirect to the canonical title). Verify at
     `en.wikipedia.org/wiki/<slug>`.
   - `openalexId`: `api.openalex.org/authors?search=<name>` → `id` without
     the `https://openalex.org/` prefix (engineers only).
   - `githubOrg` / `githubUser`, `hfOrg`: the handle in the profile URL.
3. Run `pnpm market:dry` and check the card's row + any source errors.
   `scripts/fill-ids.ts` can batch-resolve wikipedia/openalex ids if you add
   many cards at once.
