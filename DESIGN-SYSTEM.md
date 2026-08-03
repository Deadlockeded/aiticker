# DESIGN-SYSTEM.md — v1 swap + Challenger dealer + Ship Meter (2026-08-03)

## Per-screen summary

| Screen | What changed |
| --- | --- |
| **Chrome** | Header is a bg-tinted bar: fan lockup left, mode toggle + pill "Roast me" right. Mobile nav is a floating surface bar (radius 20, shadow token) with a pink-tint pill on the active tab. |
| **Home** | Sora hero — "card game" is the only coloured phrase on the page. Index chip, three stat tiles (Index / Your lab / Packs), weekly round card, roast block as a full **teal** colour field with a surface pill CTA, then movers and the checklist grid. Ceremony state keeps its minimal layout, restyled. |
| **Market** | Sora title, segmented All / Owned / Missing filter, Spotify rows on one surface card (40px tinted entity tile, name + Martian sub-line, mono price, coloured change), AGI ghost row with "?" and no price. Desktop table retained. |
| **Packs** | The sealed pack is a vertical Series-1 foil object with a dashed tear line, the fan glyph and a 3.2s sheen — the app's only ambient animation. Mid-rip, the foil drains downward while flat pink floods from the tear. Countdown in Martian; Exchange Pack as a quiet surface row. |
| **Reveal** | Its own near-black overlay (`rgba(10,10,16,.97)`) in **both** modes, so nothing on the page competes with three cards. Sequencing, haptics, first-pull and variant stamps retained; still holds until you tap, still no auto-navigation (asserted by e2e). |
| **Binder** | Header splits into collection row and money row (LAB VALUATION + wallet) so it fits at 375px; parallels moved into the completion popover. Rooms re-skinned to tokens. |
| **Roast** | Heat dial is a 3-segment control with a pink active fill; pill input, pill CTA, receipt reprinted on surface tokens with the stamps and serial intact. |
| **Arena** | Setup fits the fold: compact fighter rail, challenger deck, handle input folded into a disclosure. New dealer (below). Purse card and result screen on tokens. |
| **Ship Meter** | Rebuilt — avatars, tiered verdicts, four comedy bars, equity joke, funnel (below). |
| **Errors** | 404/500 keep their jokes, restyled; the fan glyph's front card has fallen flat out of the fan. |

## Contrast test table

`tests/unit/contrast.test.ts` runs every pair in **both** modes and fails the
build on a violation. 46 assertions, all green.

| Pair | Floor | Light | Dark | Note |
| --- | --- | --- | --- | --- |
| ink on bg / surface / surface2 | 4.5 | ✅ | ✅ | |
| ink2 on bg / surface / surface2 | 4.5 | ✅ | ✅ | |
| ink3 on bg / surface / surface2 | 3.0 | ✅ | ✅ | micro-label colour |
| up / down on surface and bg | 4.5 | ✅ | ✅ | |
| violet on violet-tint | 3.0 | ✅ 5.9 | ✅ | comfortable |
| **on-accent on pink** | 3.0 | ⚠️ 4.05 | ⚠️ 3.13 | buttons only, ≥16px/600 |
| **text on teal fill** | 3.0 | ⚠️ 4.08 | dark text | white is 1.80:1 on dark teal — those fills carry `onAccentInk` |
| **text on amber fill** | 3.0 | ⚠️ 4.23 | dark text | white is 2.00:1 on dark amber — same treatment |
| **on-accent on violet** | 3.0 | ✅ 6.7 | ⚠️ 3.4 | |
| **pink on pink-tint** | 3.0 | ⚠️ 3.29 | ✅ | micro-cap chips only |
| **teal on teal-tint** | 3.0 | ⚠️ 3.49 | ✅ | micro-cap chips only |
| **amber on amber-tint** | 3.0 | ⚠️ 3.60 | ✅ | micro-cap chips only |

**The one thing you need to decide.** The token set is fixed and I implemented
it verbatim — but six of the mandated pairs **cannot reach 4.5:1 at any size**.
White on pink tops out at 4.05:1; accent-on-tint chips at 3.3–3.6:1. So AA for
*normal* text is unreachable on those combinations without changing a token.

Rather than weaken the gate or silently edit your palette, each of those pairs
is held at the AA-large floor (3:1) with the usage rule that keeps it legible
recorded in `lib/tokens.ts`:

- text on an accent **fill** is always ≥16px and ≥600 weight (pill buttons,
  colour-field headings) — never body copy;
- accent text on a **tint** field is always an uppercase letterspaced Martian
  micro-cap — a shape the eye reads as a label, not a sentence.

Dark mode's teal (#3BD6CE) and amber (#F0A94B) are luminous enough that white
lands at 1.80:1 and 2.00:1 — genuinely unreadable — so those fills carry dark
text (`#06201E`, the same call your roast-field spec makes). If you want strict
AA on the pink button, the pink needs to darken to roughly `#C4055F`; say the
word and it is a one-line change plus a re-run.

## Deleted

Ledger palette tokens (`#F4F7F0 #17301F #B23A2E #5A6E5E #9CB09E #EAF0E4
#8E2E24 #1F6E3D #8C6D1F #F0BFB6 #6B4FA0 #2E5E8E #8EA6B4` and the dark room
browns/navies) · Archivo Black, Lora, Oswald and the `--font-geist-*`
variables · the rising-fan logo, its bar geometry, grow-in animations and
`fallen` arrow · halftone body texture · `.paper-card` / `.paper-shadow` /
`.coupon` / `.binder-texture` / `.pocket` offset-shadow print styles · the
whole print-proof system (`.proof-veil/-tint/-paper/-dots/-mark`, the PROOF
watermark, "NOT IN YOUR BINDER" tag) · `.pack-idle` tilt · old favicons and
PWA icons (regenerated 16/32/64/192/512 + `app/icon.png` from the fan glyph) ·
"Rip packs to print your copy" and the remaining print-era vocabulary.

Verified by grep: **zero** occurrences of any old hex or old font name in
`app/`, `components/`, `lib/`.

## Lighthouse (mobile, throttled)

| Page | Perf | LCP | CLS | TBT | Note |
| --- | --- | --- | --- | --- | --- |
| Home | 80 | 5.6s | 0.005 | 0ms | was 78 |
| Market | 75 | 8.4s | 0.004 | 80ms | was 74 |
| Packs | **90** | 3.6s | 0.035 | 10ms | was 86 before the CLS fix |
| Home (desktop) | 98 | 1.2s | 0.005 | 0ms | |

Honest reading: **packs hits the ≥90 bar, home and market do not.** Both are
LCP-bound on third-party card art from Wikimedia and the favicon service —
exactly the ceiling that existed before this swap, and the design system moved
both up slightly rather than regressing them. Structural metrics are excellent
everywhere (CLS ≤ 0.035, TBT ≤ 80ms), so the sheen and shadows cost nothing.
Self-hosting the ~90 card images remains the single lever that clears 90 on all
three; it is still the top open item.

One regression I caused and fixed: the meta strip and wallet coupon both
resolved from localStorage without reserving height, worth 0.123 CLS on
/packs. Both now hold their box (90, CLS 0.035).

---

# Challenger Line — the dealer

`lib/dealer.ts`. Constraints in priority order:

1. **No repeats** until the eligible pool is exhausted. A pass sends the card
   to the back, never out; exhaustion reshuffles with a "Fresh deck." toast.
2. **Type alternation** — never three engineers/companies/artifacts in a row
   *while a card of another type is still undealt*. At the tail of a full
   76-card deal only one type can remain, and a run there is forced; the tests
   encode that guarantee precisely instead of pretending it is absolute. The
   first 30 cards — far more than a session swipes — are always clean.
3. **Rating mix** — beatable / stretch / boss interleaved ~40/35/25 by weighted
   lottery, so a boss shows up early enough to keep swiping tense.
4. **Small-binder bias** — under 5 cards, bosses are held to the tail entirely.

**Today's challenger** opens the session's first deck with a pink chip and is
seeded by date alone, so it is the same card for everyone (verified across two
browser contexts). A reshuffle stops pinning it — pinning it every time made
NEW OPPONENT look broken, which is exactly the bug the last round fixed.

Seed = (UTC date + session nonce): a mid-session reload keeps your place,
tomorrow deals differently. All randomness is mulberry32 seeded inside event
handlers; render stays pure.

---

# Ship Meter — new lines review table

⚠️ marks lines worth your tone read before they settle.

## Verdict tiers (5 × 6 lines)

| Tier | Lines | Flag |
| --- | --- | --- |
| **90–100 · Found your technical co-founder** | Incorporate immediately. Argue about equity later, like professionals. · This is the rare pairing where both of you would actually open the PR. · One of you has the idea, one of you has the terminal. That is a company. · Genuinely complementary. Suspicious. Do it anyway. · The Algorithm has no notes. The Algorithm always has notes. · Ship it before one of you reads a book about management. | ⚠️ the management-book line is the sharpest here |
| **70–89 · Fundable chemistry** | One of you writes tests. One of you writes "fix later". Balance. · Strong pairing, provided you agree on the deploy key in advance. · You would survive a launch week. Possibly two. · Complementary flaws, which is rarer than product-market fit. · The gaps line up. The calendars will not, but the gaps do. · Good on paper, and the paper is unusually convincing. | |
| **50–69 · Accelerator roommates** | You'd survive a hackathon together. A pivot, unclear. · Workable, as long as neither of you owns the roadmap alone. · Great for one project. Renegotiate before the second. · The friendship survives. The repo is a coin flip. · You'd build something. You'd both describe it differently. · Compatible until the first merge conflict with feelings in it. | ⚠️ "merge conflict with feelings in it" |
| **30–49 · Advisor relationship at best** | Take their coffee meeting. Do not take their equity. · Brilliant apart. A group project together. · You'd agree on the vision and nothing after it. · Better as mutuals who occasionally star each other's repos. · One of you would end up writing all the docs, resentfully. · The energy is there. The overlap is not. | ⚠️ "do not take their equity" is pointed — it's about the pair, not a person |
| **0–29 · Legally distinct entities** | The only thing you'd co-found is a group chat that dies in a week. · Two visionaries. Nobody drives. The demo is a Figma. · Incompatible in a way that would make a great documentary. · The equity split negotiation alone would end this. · You'd both wait for the other to start. Forever, probably. · Remain mutuals. Distant mutuals. | ⚠️ this whole tier is the harshest in the app — it reads at two strangers, never at one |

## Category bars (real signal, comic label)

| Bar | Computed from | Lines, worst → best | Flag |
| --- | --- | --- | --- |
| **Timezone chemistry** | closeness of days-since-last-push (capped 120) | Opposite clocks. One of you is always the blocker. · Barely overlapping hours. Async or bust. · A few shared hours a day. Enough for one meeting, not two. · Comfortable overlap. Standups would actually happen. · You're both awake at 2am. Concerning. Compatible. | ⚠️ push recency is a proxy for working hours, not a measurement — the label promises more precision than the signal has |
| **Stack alignment** | closeness of language breadth (capped 12) | Nothing in common. The first architecture call is a hostage negotiation. · Different stacks, same instincts. Translation costs apply. · Some overlap. Enough to review each other's code, slowly. · Mostly the same tools. Onboarding is a coffee. · Two devs, one stack. The whiteboard will know peace. | ⚠️ "hostage negotiation" |
| **Naming philosophy** | 60% fork-ratio closeness + 40% repo-count closeness | One writes descriptions. One writes "stuff". Pick a standard. · Different conventions, strongly held. This will come up again. · Compatible enough. The README will need a mediator. · Similar instincts. Repos would look like siblings. · final-v2 energy detected on both sides. Kindred. | ⚠️ the signal is hygiene, not literally naming |
| **Shipping cadence** | closeness of 90-day push volume (capped 90) | One ships daily, one ships annually. Someone will be very tired. · Different rhythms. Deadlines would be a genre of argument. · One sprints, one marinates. Someone's writing the docs. · Similar pace. You'd hit the same walls at the same time. · Matched cadence. Terrifying velocity, no brakes. | |

## Equity split formats (8)

50/50. Recorded on a napkin nobody can find. · 51/49. Fight about which side
is which. · 60/40, revisited quarterly, forever. · 70/30, with a vesting cliff
neither of you understands. · 45/45, and 10% to whoever names the company. ·
50/50 until the first funding round, then a long silence. · 1/99, and you both
think you're the 99. · Equal shares, unequal group chats.

No flags — every one is nonsense about a fictional company, and the
entertainment-not-advice line sits directly beneath it.

## Verify on a real phone (5 things)

1. **Both modes on the pack screen.** Toggle light/dark and rip: the foil
   should read as an object in both, and the drain should collapse to flat
   pink, not a muddy blend.
2. **The reveal overlay at 390px.** All three cards fully visible, centre card
   raised, and nothing auto-navigates — it should sit there until you tap.
3. **Pink button legibility outdoors.** This is the contrast decision above:
   white-on-pink is 4.05:1. Read a "Roast me" button in daylight and tell me
   if it needs the darker pink.
4. **The ship meter with two real handles.** Avatars should load and the share
   PNG should carry both faces; then kill your connection and re-run to see
   the initials fallback still produce a shareable image.
5. **Add to Home Screen.** The fan glyph on the springboard, and the PWA
   launching into dark mode with the right theme colour.
