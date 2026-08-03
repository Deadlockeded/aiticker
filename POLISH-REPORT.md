# POLISH-REPORT.md — Roast Upgrade + Final Mobile Polish (2026-08-03)

## PART A — Roast upgrades (shipped)

/roast is the canonical front door (input autofocused, header ROAST ME
retargeted, old redirect removed). Heat dial MILD / MEDIUM / EXTRA CRISPY
as line-pool tiers; receipts carry a client-minted ROAST Nº (hash of
handle+heat — deterministic so burn links show the sender's number; not
authoritative, commented), a rotated PREPARED stamp, share-image export
(stamp + serial + fan mark + URL), "Send them this →" burn links with the
"You've been roasted." / "Avenge yourself →" flow, and the three-step
funnel (GET YOUR CARD prefills /create?gh=, SHIP METER, FIGHT THE INDEX).
Homepage: sample-receipt block on returning states; one quiet "or get
roasted first →" line in the ceremony. OG unfurls render the receipt.

### New roast lines by tier (review table)

| Pattern | MILD (new) | EXTRA CRISPY (new) | Flag |
| --- | --- | --- | --- |
| test repos ≥3 | {n} repos named "test". We have all been there. | {n} repos named "test". At this point "test" is the brand. | |
| portfolios ≥2 | {n} portfolio sites. Thorough. | {n} portfolio sites, zero portfolio pieces. The frame is the art. | |
| "stealth" bio | Bio says "stealth". Cozy. | "Stealth" bio, public repos. The only person it is hidden from is you. | ⚠️ borderline-personal? (still footprint-based) |
| fork ratio >70% | {p}% forks. A well-stocked reference shelf. | {p}% forks. Ctrl+C as a career arc. | ⚠️ sharpest of the set |
| abandoned ≥10 | {n} quiet repos. They are resting. | {n} abandoned repos. The commit graph qualifies as a memorial garden. | |
| push >1y | Over a year since a push. Life happens. | A year of silence. Even dependabot stopped writing. | |
| push 90–365d | {d} days since a push. A sabbatical. | {d} days quiet. The contribution graph looks like morse code for "later". | |
| 0 stars, 5+ repos | {n} repos, stars pending. | {n} repos, zero stars. Performance art without an audience. | ⚠️ check it lands affectionate |
| one repo carries | One repo does the heavy lifting. A star player. | One repo carries the account like a parent at a school play. | |
| one language >85% | {p}% {lang}. Loyal. | {p}% {lang}. The language has asked for space. | |
| no descriptions ≥5 | {n} repos without descriptions. Minimalism. | {n} undocumented repos. Even their author navigates by vibes. | |
| repos >80 | {n} public repos. Prolific. | {n} repos. Not a portfolio — a cry for a monorepo. | |
| lurker (≤2 repos, 3y+) | {y} years, {n} repos. Quality over quantity. | {y} years for {n} repos. Geological pace. The commits are sediment. | |
| stars >10k | Five-digit stars. Genuinely impressive. That is the whole roast. | Five-digit stars and here for validation from a card game. Growth. | |
| fallback 1 | The commit messages are brief. Efficient. | The commit history reads "fix", "fix2", "actual fix". A trilogy. | |
| fallback 2 | Somewhere in there is a branch that could use a tidy. | A branch named "final-final-2" has outlived several startups. | |
| fallback 3 | The READMEs are optimistic. Keep them that way. | The README says "coming soon". The repo's birthday disagrees. | |

## PART B — Polish sweep

### B1 Seams
- Palette: **zero** pre-Ledger hex survivors (grep across app/components/lib, all casings + rgba forms).
- Copy: no "3 free daily", peek/facedown, magazine voice, or "/76" totals in user-facing strings (remaining "facedown" hits are code comments about the pack pre-flip stack, which is genuinely facedown).
- Logo: zero riffle/tape remnants; fan mark verified in header, footer-on-ink, 16px favicon, card OG, roast OG.
- Brand casing: zero AITICKER / "AI Ticker" outside identifiers/domain.
- Reveal→binder→rooms: rooms read the binder via the shared store bus, so new copies (variant+serial) appear in all three rooms and the sheet without refresh (verified by architecture + rooms e2e).
- Funnel: roast → create (gh prefill) → ship meter (a=) → arena (vs=@) all carry the handle; covered by e2e.
- Consolidation debt (honest): variant dots render in binder pockets and the copies sheet from small inline snippets, and the gold treatment in rooms is a ring/frame — one `VariantBadge` component would be cleaner. Not extracted this pass.

### B2 Motion inventory (all transform/opacity; reduced-motion kills each)
| Animation | Duration | Family |
| --- | --- | --- |
| Pack tear/shake/vanish | 450–650ms | card-physical |
| Stack deal-in → fan flip | 550ms + 500ms/card, 150ms stagger | card-physical (hero #1) |
| Halftone→color resolve | 900ms +150ms delay | card-physical (hero #2) |
| Variant fx (glow/confetti/haptic) | at flip +200–250ms | card-physical (hero #3) |
| Logo grow-in | 450ms/bar, 200ms stagger, arrow pop 300ms | chrome (hero #4) |
| Binder page snap + haptic tick | native scroll-snap | card-physical (hero #5) |
| Foils/sheens (legendary, silver, holo, back) | 5–9s ambient loops | ambient |
| Chrome (paper-in, deal-in captions, toasts) | ≤350ms | chrome |
Nothing waits out a timer — every reveal advance is a tap (enforced by e2e).

### B3 Layout & type
- Tap targets: room switcher and meta chips bumped to min-h-11 (44px) this pass; heat dial/funnel links built at 44px. Variant dots are informational, not interactive.
- Sub-11px text is confined to decorative micro-labels (serials, pocket names, call-tile labels) per the exemption.
- Countdowns: pluralization correct; "0m" flash clamped to a 1m floor.
- Safe areas: tab bar + floating chips use env(safe-area-inset-*) (unchanged, re-verified).

### B4 States
- Homepage resolves from a neutral paper stub (no wrong-state flash, CLS ≈ 0).
- GitHub fetches show inline "Preparing…/Scoring…" states; failures render styled errors and never strand input.
- Interrupt safety: the pack is consumed at rip-time and pulls are written to the binder immediately, so backgrounding mid-reveal can't eat cards — worst case you re-open to the binder with everything saved.
- Offline: **not fully styled** — no service worker, so a cold offline visit gets the browser page. Listed under imperfections.

### B5 Shares
Regenerated + eyeballed this pass: roast OG (sample receipt), burn-link OG, card OG (fan mark). Canvas exporters (arena/prospect/ship meter) draw the fan via the shared drawLogoMark. Native-share fallback path unchanged and feature-detected.

### B6 Lighthouse (mobile, throttled)
| Page | Perf | BP | SEO | Note |
| --- | --- | --- | --- | --- |
| /roast | 90 | 100 | 100 | new page, clean |
| Home (returning) | 78 | 100 | 100 | LCP 6.1s = third-party card art; CLS 0.007, TBT 30ms |
| Market | 74 | 100 | 100 | LCP 9.1s = 76 remote avatar thumbs; CLS 0.003, TBT 80ms |
The structural metrics (CLS/TBT) are healthy everywhere; the only real
perf lever left is **self-hosting the card art** (standing open question).

### Remaining imperfections (honest list)
1. Home/market Perf < 90 — third-party art LCP; needs self-hosted images.
2. No offline page (no service worker).
3. Variant badge rendering not yet a single component (3 inline variants).
4. Boardroom legendaries use col-span sizing, not a true center-wall layout.
5. Landscape is functional but unloved (fan slightly high, rooms fine).

### Verify on a real phone (5 things)
1. Ceremony → rip → stack → fan on a physical 390px screen: all 3 cards readable, haptics fire on rare+.
2. Press the heat dial + roast a real handle; share the receipt via the native sheet (WhatsApp/X) and confirm the PNG.
3. Open a burn link from a chat app webview: banner + avenge flow + OG unfurl.
4. Binder rooms switcher with 20+/40+ cards; Boardroom scroll feel.
5. Add to Home Screen: fan icon on the springboard + PWA launch.

---

## Depth Update — what a maxed collector still chases
Base S1 (76) is the headline; then **silver sets (9%/pull, ed.100), gold
(2.5%, ed.25), holo (0.5%, ed.10)** per card — at 6 pulls/day, a full-silver
S1 alone is months, full-gold years-scale, any single holo a genuine event;
plus **Series 1.5 (15 cards) in ~3 weeks** and future drops each adding a
sealed set with its own variant ladder; plus **AGI at 0.1%**. The two-week
completionist problem is dead: base is achievable, the parallels are the
years-long endgame, and drops keep the frontier moving.
