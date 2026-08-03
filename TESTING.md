# TESTING.md

## Smoke suite (Playwright)

```bash
pnpm build          # tests run against the production build
pnpm test:e2e       # starts `next start -p 3123` itself (or reuses one)
```

One project: Chromium with a Pixel 7 profile at 390×844 — mobile is the
primary surface. CI runs the suite on every push/PR (`.github/workflows/e2e.yml`)
and uploads traces on failure.

### What it covers (tests/smoke.spec.ts)

- **Renders clean** — every page (`/`, market, packs, arena, binder, create,
  howto, about, a card detail) with zero console errors and zero same-origin
  404s. Card art is third-party (Wikimedia/favicons via `/_next/image`) and
  CI runners get rate-limited (429) upstream, so the suite aborts art
  requests (`blockArt`) — the monogram fallback renders — and filters
  resource-load console noise for art URLs out of the zero-error assertion.
- **Rip flow** — tap the pack on /packs, auto-flip carries to /binder, the
  binder key is written and survives a reload.
- **Deck** — gallery defaults to the deck on mobile; `next →` advances the
  progress strip.
- **Market** — 40+ card rows and ₮ prices render.
- **Arena** — binder seeded via `addInitScript`, fighter picked, a full
  3-round fight resolves to a verdict.
- **Proof states** — unowned cards keep every word readable with proof art
  (NOT IN YOUR BINDER, tier odds, RIP PACKS CTA); owned cards render full
  color with binder actions; the gallery shows Collected: n/76.
- **Get rated (manual)** — GitHub API access is aborted by route
  interception; the manual build still produces a card.

### Conventions

- Proof-state tests use `/cards/openai` — a fresh profile owns nothing, so
  any card renders as a print proof.
- Seed state with `addInitScript` (runs before app code); the helper also
  stamps all onboarding flags so first-run captions don't race assertions.
