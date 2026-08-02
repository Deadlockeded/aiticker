# OVERNIGHT-REPORT.md — run of 2026-08-03

Everything from the overnight order, plus the two feature orders that were
in flight when it arrived (Daily Meta, Mystery rework) — all built,
committed per phase, tested, and deployed. No unresolvable blockers.

**Commits this run:** onboarding → daily meta → mystery rework → Phase 0
(tone) → Phase 1 (cleanup) → Phase 2 (share QA) → Phase 3 (tests) →
Phase 4 (perf) → Phase 5 (docs, this file).

---

## Pre-phase work (the two in-flight orders)

### How To Collect + onboarding
- First-run guided rip: "NEW COLLECTOR? START HERE" tag on the homepage
  pack coupon; caption beats at tear/flip/binder-landing; one-time arena
  nudge coupon; two arena captions. ~6 one-liners, all skippable, each
  shown exactly once (`lib/onboarding.ts`).
- `/howto` — illustrated rules page, 6 numbered panels with ink-on-cream
  SVG line diagrams, footer-linked. (Retitled "How it works" in Phase 0.)

### The Daily Meta — full category formula table

Every value = `clamp(5–99, formula + wobble)` where `wobble = fnv(cardId +
category) % 17 − 8` (stable ±8 per card+category — fixed, never random per
fight). 4 categories are IN THE META per UTC day; each fight draws 3 of
the 4 via pairing hash. Hot cards get +3 on whatever's active.

| Category | Definition | Index-card formula | Artifact formula | Prospect formula |
| --- | --- | --- | --- | --- |
| SHITPOSTING | The art of saying it anyway. | .55·momentum + .30·influence + min(14, 2·HN mentions) | .45·ubiquity + .35·vibes | .80·yapping |
| DRAMA | Finds the storyline. Or is the storyline. | .45·momentum + .25·influence + min(30, \|attentionΔ\|) | .35·uselessness + .30·vibes | .55·yapping + .20·gpuHoarding |
| AURA | Unmeasurable. We measured it. | .55·influence + .35·rating | .55·vibes + .25·lore | .40·yapping + .40·galaxyBrain |
| LORE | Years of backstory, weaponized. | eng: 2.5·years + .35·influence · co: .50·influence + .35·rating | .85·lore | .70·rating |
| SHIPPING | Actually builds the thing. | .70·momentum + .25·innovation | 55 − .40·uselessness | .95·shipping |
| GALAXY BRAIN | Thinks in dimensions we bill for. | .70·innovation + min(20, 5·log₁₀ citations) | .40·lore + .30·uselessness | .95·galaxyBrain |
| HYPE | Currently everywhere. | .50·momentum + .25·influence + clamp(±25, attentionΔ) | .55·ubiquity + .25·vibes | .55·yapping + .30·shipping |
| MYSTIQUE | Says nothing. Moves markets. | .80·influence − .35·momentum + 25 | .50·lore + .30·uselessness | .50·galaxyBrain − .25·yapping + 30 |
| GRINDSET | The streak is the personality. | .55·momentum + .25·innovation + min(15, 4·log₁₀ stars) | .50·ubiquity + .15·vibes | .75·shipping + .15·gpuHoarding |
| MAIN CHARACTER ENERGY | It's their timeline. We're posting in it. | .45·influence + .35·momentum + min(12, \|attentionΔ\|/2) | .50·vibes + .30·ubiquity | .55·yapping + .30·shipping |

Hand-tuned artifact canon (`ARTIFACT_OVERRIDES`): The Em Dash SHITPOSTING
71 · Ignore Previous Instructions DRAMA 88 / MYSTIQUE 9 · The Hallucinated
Citation GALAXY BRAIN 12 / LORE 84 · AGI In Two Weeks HYPE 97 / SHIPPING 6
· The GPU AURA 90 / GRINDSET 99 · Vibe Coding GRINDSET 8 / SHIPPING 66 ·
The Stochastic Parrot SHITPOSTING 79 · The Waitlist MYSTIQUE 92 /
SHIPPING 5. AGI reads 50±wobble for display; its rounds still coin-flip.

**Today's meta (2026-08-03, real):** HYPE · AURA · LORE · MYSTIQUE.
Meta watch: "Lore is in the meta. Geoffrey Hinton remembers when this was
all fields."

**Sample fight transcript (real values, today):** Andrej Karpathy vs
OpenAI. The pairing hash draws Aura, Hype, Mystique from today's four.
Round 1 — AURA ("unmeasurable; we measured it"): Karpathy 91, OpenAI 85.
Round 2 — HYPE: Karpathy 85, OpenAI 77. Round 3 — MYSTIQUE: Karpathy 62,
OpenAI 66. **Karpathy takes it 2–1**; share text names the decisive
category ("Sealed it on AURA."). Same matchup tomorrow may flip — the
active four rotate. That's the point.

### Mystery rework
- SHARED = REVEALED: any detail page opened with `?ref=` renders face-up
  with a REVEALED BY A COLLECTOR stamp + quips; every generated share URL
  carries the ref (detail share button, quip copy). Direct nav stays
  facedown.
- THE PEEK: press-and-hold 600ms flips a facedown card while held
  (gallery, detail, binder chase pockets); first peek stamps PEEKED
  (lifetime counter in the binder header); pulling clears the stamp;
  never-peeked first pulls get SIGHT UNSEEN.
- CHECKLIST SPOTLIGHT: one non-legendary/mythic card face-up everywhere
  weekly, cycling in id order, SPOTLIGHT chips in Market + gallery.

---

## Phase 0 — tone recalibration (full before/after, for your veto)

Design tokens untouched. Everything on the KEEP list (quips, flavor,
roast/verdict lines, stamp names, meta definitions) untouched.

| Where | Before | After |
| --- | --- | --- |
| Masthead | "ISSUE Nº 1 · AUGUST 2026 · ₮ FREE FOREVER" | *(removed)* |
| Masthead tag bar | "The hobby's official* price guide — *self-declared" | *(removed)* |
| Masthead subline | "76 cards · rip packs · build your binder · fight the index" | "Trading cards for the AI industry. Real data. Fake money." + "76 cards · 3 free packs daily" |
| Nav tab | "GUIDE" | "MARKET" |
| Homepage box | "★ Cover star of the month ★" | "★ Featured card ★" |
| /market h1 | "The Price Guide" | "Market" |
| /market section | "Book values — full checklist" | "Book values — all cards" |
| Pack countdown | "Next issue of free packs in 14h. — The Editor" | "Next free packs in 14h." |
| Tutorial beat 1 | "Rule one: tap the pack. There is no rule two." | "Tap the pack." |
| Arena 10-pass line | "…take this personally. — The Editor" | attribution dropped |
| Arena empty state | "You fight with cards from your binder — rip your free daily packs first." | "No cards yet. Rip a pack first." |
| Binder tutorial link | "SEE THE FULL RULES →" | "HOW IT WORKS →" |
| Homepage coupon | "✂ Subscribe: 3 free packs daily, delivered to your binder" | "✂ 3 free packs daily, straight to your binder" |
| PEEKED tooltip | "We're not judging. We're counting." | *(removed — plain counter)* |
| SIGHT UNSEEN | planned "Pulled blind. Respect. — The Editor" line | stamp only, no line (shipped per Phase 0) |
| /howto title | "How to collect, illustrated" | "How it works" |
| /howto panel 1 | "…Odds are printed on the shop wall." | "3 free packs daily. Odds posted on the packs page." |
| /howto panel 2 | "…The artifacts are… look, they're part of it." | "…Yes, the artifacts count." |
| /howto panel 3 | "Today's meta changes daily." | "The meta rotates daily." |
| /howto panel 4 | "Sell dupes to The House at book value…" | "Sell dupes at book value…" |
| /howto panel 5 | "The scout is not gentle." | "It is not gentle." |
| /howto footer | "Disputes may be addressed to The Editor, who is not listening. — mgmt" | *(removed)* |
| /about h1 + title | "From the Editor's Desk" | "About" |
| /about intro | "the internet's leading* price guide…" + asterisk paragraph | "a live index of the AI industry, in trading-card form, built on real public data and fake money." |
| /about staff box | "Masthead" · "The Editor — Founder, publisher, subscription department. Has a binder…" | "Staff" · "Founder — Has a binder…" (Claude entry's "Editor" → "founder", ×2) |
| /about Circulation | 4-line circulation bit | *(section removed)* |
| /about FAQ | "We publish a price guide for a card of a paperclip." | "We publish a price for a card of a paperclip." |
| /about signature | "— THE EDITOR / 'Never rip packs angry.'" | "Never rip packs angry." (unattributed) |
| OG promo (about) | "From the Editor's Desk" / "The internet's leading* price guide…" 📰 | "About aiticker" / "Trading cards for the AI industry. Real data. Fake money." 📇 |
| Arena page header | "Best of three stat clashes — upsets only in chaos mode." | "3 rounds drawn from today's meta — best stats win." |
| Detail share CTA | "Share" | "Reveal this card to someone" |
| Error page (new) | — | "Something broke. Refresh usually fixes it." |

Kept deliberately (dry but not cosplay — flag if you disagree):
"Complete the index. That's the whole hobby." · "Ticks are fake. The
feelings are real." · "Never rip packs angry." · "Get scouted. Get
roasted. It's the same department." · the arena captions ("Swipe past
cowards. Tap FIGHT on victims.").

## Phase 1 — the great cleanup

**Deleted:** `components/TrendingStrip.tsx` (unimported), `issueNumber()`
(orphaned by Phase 0), `resolveVs()` (superseded by arena resolution),
`public/{file,globe,next,vercel,window}.svg` (starter debris).
**Deduped:** 4 copies of FNV-1a/mulberry32 → `lib/rng.ts` (daily, market,
vsMapping, shipmeter now import it).
**Storage:** new `lib/storage.ts` gateway (typed `KEYS`, try/catch
accessors, versioned migration v2 clears `labs/tickerdle/tiers/visits/
votes` keys from existing users' browsers — found by sweeping every key
ever committed in git history). All access routed through it. STORAGE.md
documents every key + schema.
**TS:** strict already on; tsc clean; zero `any` in lib/.
**Render check:** all 14 routes 200 on the prod build. Client chunks
total ~2.3 MB (pre-gzip, all routes; no route-size regression — table
unchanged before/after).

## Phase 2 — share image QA

Surfaces: 3 canvas exports (prospect card + roast, arena result, ship
meter) + 3 OG routes (`/api/og/[id]`, `/vs`, `/promo`).

| Surface | Long content | Missing data | Fonts | Tokens | Watermark |
| --- | --- | --- | --- | --- | --- |
| Prospect card PNG | name/title/roast lines sliced, verdict wrapped max 2 | no photo → initials | **fixed** → brand via `brandFonts()` | dark card frame is the card's own design (kept) | ✓ |
| Arena result PNG | labels sliced 18 | no avatar → monogram | **fixed** → brand | **fixed** — was off-palette dark/cyan/amber, now cream/ink/red/green paper panels | ✓ |
| Ship meter PNG | handles sliced | no avatar → monogram | **fixed** → brand | dark kept (flagged below) | ✓ |
| OG card | **fixed** — >18-char names scale 76→54px + wrap (verified) | **fixed** — emoji avatars rendered tofu; now name monogram on cream | satori default | cream/ink/rarity accents | ✓ footer |
| OG vs | **fixed** — truncation 24→30 chars | defaults "You"/"The Index" | satori default | **fixed** — amber → accent red | ✓ |
| OG promo | static | static | satori default | cream/ink/red | ✓ |

All OGs verified 1200×630 by fetching; per-page titles present on every
route; all card share URLs carry `?ref=` (detail button, quip copy);
challenge links target /arena where opponents are exempt anyway. Share
texts audited: all < 200 chars, plain register. `sharePng` = Web Share
API with files → download + clipboard fallback, used by all three canvas
exports.

## Phase 3 — smoke tests

17 Playwright tests, Chromium Pixel-7 profile at 390×844, against the
production build. Coverage in TESTING.md (per-page zero-console-error +
zero same-origin-404, rip→binder + persistence, deck advance, market
prices, full arena fight, peek-and-hold → PEEKED, share-ref reveal vs
facedown direct nav, manual get-rated with GitHub aborted, about/howto).
`pnpm test:e2e` + `.github/workflows/e2e.yml` on push/PR with traces on
failure. **17/17 passing.** One prod-code test hook:
`data-testid="peekable"`.

## Phase 4 — performance + webview hardening

Lighthouse mobile (throttled), Perf / Best-Practices / SEO:

| Page | Before | After |
| --- | --- | --- |
| Home | 63 / 100 / 100 (CLS 0.416, LCP 4.7s) | **83** / 100 / 100 (CLS 0, LCP 4.7s) |
| Market | 85 / 100 / 100 | **87** / 100 / 100 |
| Card detail | 86 / 100 / 100 | **88** / 100 / 100 |
| Binder | 92 / 100 / 100 | **92** / 100 / 100 |
| Arena | 91 / 100 / 100 | **91** / 100 / 100 |

Fixes: Featured Card zero-CLS skeleton; META WATCH row reserved;
gallery default view now CSS-responsive (server paints the mobile deck —
no post-hydration swap); preconnect to the two art hosts. Remaining LCP
on home/market/card is third-party card art over throttled 4G — see open
questions. Webview: every `navigator.*` call feature-detected; storage
gateway no-ops without localStorage and SessionlessNotice explains it on
/packs + /binder; challenge/share links run stateless. Error boundaries:
`app/error.tsx` + `global-error.tsx`, plain register. Largest client
chunks: 6× ~231 KB framework/vendor + 227 KB app commons (pre-gzip); no
single heavy feature module worth dynamic-importing showed up (TBT is
30–40 ms everywhere).

## Phase 5 — docs

README.md rewritten (was create-next-app boilerplate). CLAUDE.md
rewritten as the project map: routes, lib modules, tokens, THE MAGAZINE
RULE, mystery/reveal rules, house patterns, storage pointer. This report.

---

## Needs your decision

1. **Homepage/market Perf < 90:** the LCP is Wikimedia/favicon card art
   on throttled 4G. The real fix is self-hosting the ~75 images (build
   step, ~2–5 MB in repo, licensing still fine since they're
   freely-licensed) — want that?
2. **Ship meter PNG** still uses its old dark styling (brand fonts +
   watermark applied). Restyle to cream/ink like the arena export, or
   keep the contrast?
3. **Kept copy** flagged at the end of the Phase 0 table — veto anything
   that still reads as cosplay to you.
4. **Vercel↔GitHub connect** is still pending in your dashboard — until
   then the nightly market commits don't auto-deploy (I deploy manually
   via CLI).
5. **SIGHT UNSEEN on nearly every pull:** since most collectors never
   peek, most first pulls earn the stamp. If it should feel rarer, invert
   it (only show when some cards HAVE been peeked) — say the word.
