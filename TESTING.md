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
  404s. Third-party card art (Wikimedia, favicons) is excluded from the 404
  assertion so the suite is deterministic offline.
- **Rip flow** — tap the pack on /packs, auto-flip carries to /binder, the
  binder key is written and survives a reload.
- **Deck** — gallery defaults to the deck on mobile; `next →` advances the
  progress strip.
- **Market** — 40+ card rows and ₮ prices render.
- **Arena** — binder seeded via `addInitScript`, fighter picked, a full
  3-round fight resolves to a verdict.
- **Peek** — press-and-hold 900ms on a facedown hero flips it, stamps
  PEEKED, and records `ai-index:peeked:v1`.
- **Mystery** — `?ref=share` renders REVEALED BY A COLLECTOR; direct
  navigation stays facedown with the UNPULLED coupon.
- **Get rated (manual)** — GitHub API access is aborted by route
  interception; the manual build still produces a card.

### Conventions

- Facedown-state tests use `/cards/openai` — legendary, therefore never the
  weekly SPOTLIGHT card, therefore reliably facedown for a fresh profile.
- Seed state with `addInitScript` (runs before app code); the helper also
  stamps all onboarding flags so first-run captions don't race assertions.
- `data-testid="peekable"` on PeekableBack is the one test hook in
  production code.
