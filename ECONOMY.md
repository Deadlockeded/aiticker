# ECONOMY.md — the Tick loop (2026-08-03)

Constants live in `lib/economy.ts`; the wallet gateway is `lib/wallet.ts`;
the two claimable rituals are `lib/rituals.ts`. Nothing here can be bought
with money, and nothing can be wagered.

## Hard rules (commented in economy.ts)

1. **No wagering, ever.** Ticks can never be staked, risked, or lost by
   fighting. A loss still pays ₮15. There is no bet input anywhere.
2. **No real money.** Ticks cannot be purchased or cashed out. The only sink
   is the Exchange Pack; the only sources are play.
3. **Earned packs are capped.** `EARN_DAILY_CAP` bounds clippable income so
   no grind pattern can reach two earned packs a day.

## Constants

| Constant | Value | Note |
| --- | --- | --- |
| `EXCHANGE_PACK_COST` | ₮500 | identical contents and odds to a free pack |
| `PURSE_WIN` / `PURSE_LOSS` | ₮75 / ₮15 | losing still pays |
| `PURSE_UPSET_PER_POINT` / `_MAX` | ₮8 / ₮200 | per rating point below the opponent |
| `PURSE_STREAK_BONUS` | ₮50 / ₮150 / ₮300 | at 3 / 5 / 10 consecutive wins, reset on a loss |
| `PURSE_FIRST_WIN` | ₮100 | first win of the UTC day |
| `DAILY_VISIT_TICKS` | ₮50 | once per UTC day, at boot |
| `WEEKLY_ROUND_TICKS` | ₮300 | RAISE A ROUND, once per ISO week |
| `DUPE_SALE_RATE` / `_MIN` | 5% of book / ₮5 | never sells your last copy |
| `EARN_DAILY_CAP` | ₮650 | purses + dupe sales; rituals exempt from clipping |

## Earn-rate table

Assumptions: an "active" day means one visit, an arena session, one spare
copy sold, and the weekly round amortised across seven days (₮43/day). Free
packs (1 per 8h, bank 2) are **on top** of everything below — these are
*earned* packs only.

| Pattern | Daily Ticks | Days per ₮500 pack | Earned packs/day |
| --- | --- | --- | --- |
| Lapsed (visit only) | 50 | 10.0 | 0.10 |
| Casual (visit + 1 win) | 225 | 2.2 | 0.45 |
| Casual+ (visit + 2 wins + small royalty) | ~315 | 1.6 | 0.63 |
| **Active (visit + 4 wins w/ 3-streak + dupe + ~₮25 royalties + weekly)** | **~600** | **0.85** | **~1.2** |
| Grinder (caps out) | 700 | 0.7 | 1.40 |
| Grinder on round day (cap + visit + round) | 1,000–1,100 | — | ≤2.2, at most weekly |

ROYALTIES fold INSIDE the budget rather than stacking on it: royalty grants
are CAPPED grants, so they consume the same ₮650/day clippable allowance as
purses and dupe sales. Their own triple cap (3 copies per artifact, ₮60 per
trigger day, 7-day lookback) keeps a typical holder at ₮10–35/day. The active
player moves ~578 → ~600 — still ~1.2 packs/day — and the hard ceiling is
unchanged because the ₮650 clip absorbs royalties entirely. THE FUND's +₮50
round bonus raises the once-a-week oversubscribed ceiling to ₮1,100 ≈ 2.2
packs — accepted drift, at most weekly, documented in economy.ts.

The last row is the hard ceiling and it occurs at most once a week. Every
other day tops out at ₮700 = 1.4 packs. The single largest possible purse —
a 59-point upset, on a 10-win streak, on the day's first win — is ₮675, so
one extraordinary fight can fund one pack; the cap stops the second.
`tests/unit/purse.test.ts` asserts all of this.

Levers if this needs retuning later: `EARN_DAILY_CAP` moves the ceiling,
`DUPE_SALE_RATE` moves the passive floor, and `EXCHANGE_PACK_COST` moves
everything at once.

## Review table — every new line

### Funding artifacts (Series 1.5, sealed until the drop date)

| Card | Tagline | Flavor | Flag |
| --- | --- | --- | --- |
| The Seed Round | Money for a deck and a dream | Nothing exists yet. That is the whole appeal. | |
| The Valuation | The number went up | Nobody asked how. Asking how is considered rude. | |
| The Term Sheet | Non-binding, mostly | Four pages. One of them matters. It is not page one. | |
| The Pivot | Same team, new everything | The old plan is now the origin story. | |
| The Burn Rate | Money, but faster | Runway is a countdown with better branding. | |
| The Down Round | The number went the other way | Still a round. Technically. Legally. | ⚠️ closest to a real-company sore spot — it names no one, but read it once more |
| The Stealth Startup | Pre-product, post-money | The website is a black square and an email address. | |
| The Exit | Everybody says it was always the plan | The team stays two years. Nobody stays two years. | |

Quips (5 each, 40 total) are in `data/cards.json`. The ones worth a second
read:

| Card | Quip | Flag |
| --- | --- | --- |
| The Term Sheet | "Non-binding, except for the parts that decide everything." | |
| The Term Sheet | "Everyone agreed it was standard. Nobody said standard for whom." | |
| The Down Round | "Preference stacks: the horror genre of finance." | ⚠️ sharpest of the set |
| The Down Round | "Reframed internally as a recapitalization. Externally as nothing." | ⚠️ |
| The Exit | "The product sunsets in eighteen months. That is paragraph nine." | ⚠️ specific enough to feel pointed — it isn't about anyone |
| The Exit | "Two-year retention package. Average stay: eleven months." | ⚠️ invented statistic about a fictional object; fine by the hard rule, flagged for taste |
| The Stealth Startup | "Three years of stealth. At some point that is simply privacy." | |
| The Burn Rate | "Twelve months of runway. Eleven, actually. Ten." | |

### Investor pool (15, all fictional — no puns on real funds)

Uncle Dave · The Group Chat · Gut Feeling Capital · Three Dentists And A
Podcast · Perpetual Motion Partners · A Family Office That Won't Name The
Family · Someone's Former Manager · Slightly Bored Sovereign Wealth ·
Diligence-Free Ventures · The Cousin Fund · A Man Who Owns Several Airports ·
Post-Rational Capital · The Guy From The Conference Hallway · Vibe-Weighted
Holdings · Two Angels And A Spreadsheet

No flags — every name is invented and none rhymes with, abbreviates, or puns
on an existing firm. Checked by hand against the well-known funds.

### Terms pool (10)

vibes · a napkin · one warm intro · a handshake at baggage claim · a
liquidation preference nobody read · pro-rata on everything, forever · a
board seat for their nephew · no cap, no floor, no notes · a SAFE with a typo
in it · an option pool that eats you last

⚠️ "a board seat for their nephew" is the only one that jokes about a person
rather than a document.

### Funding stages (XP ladder) and their level-up lines

| Level | Stage | Line |
| --- | --- | --- |
| 1 | Garage | You've founded something. It has no name yet. |
| 2 | Pre-Seed | You've raised a pre-seed. Congratulations on the adjective. |
| 3 | Seed | You've raised your Seed. |
| 4 | Series A | You've raised your Series A. |
| 5 | Series B | You've raised your Series B. |
| 6 | Unicorn | You're a unicorn. Nobody has checked the math. |
| 7 | Decacorn | Decacorn. The word is real now, apparently. |
| 8 | IPO'd | You've IPO'd. Somewhere a lock-up clock starts. |
| 9+ | Acquired (Derogatory) | You've been acquired. Everyone says it was always the plan. |

### Seasoned prospect verdicts (lib/score.ts)

| Trigger | Line | Flag |
| --- | --- | --- |
| high clout, low shipping | Fundable. Unfortunately. | ⚠️ the sharpest verdict in the file |
| few repos, many followers | Pre-product, post-following. The deck writes itself. | ⚠️ |
| GPU-heavy, low shipping | Burn rate: confirmed. Product: pending. | |
| galaxy-brain, quiet | Would raise on a whiteboard photo. Will not post the photo. | |
| ML repos, low stars | Deep tech, deeply pre-revenue. The best kind of pre. | |

### Company quips (real cards — grounded in public lore only)

| Card | Quip | Why it's safe | Flag |
| --- | --- | --- | --- |
| OpenAI | Capped profit. Uncapped conversation about the cap. | the capped-profit structure is public and self-described | ⚠️ |
| Safe Superintelligence | No product, by design. The roadmap is one sentence long. | states the company's own stated posture; no deal or number | ⚠️ |
| Hugging Face | The moat is everyone else's goodwill. Somehow it holds. | about open-source community standing, not finances | ⚠️ |

**No real company's funding is described anywhere.** No amount, round name,
investor, or valuation is attached to a real company or person in any of
these lines. The three above are flagged purely so the tone gets a second
read, not because they assert anything.

### Other new copy

| Surface | Line |
| --- | --- |
| Exchange sheet | "Three cards. The same odds as a free pack." |
| Exchange coupon (afford) | "Same cards. Same odds." |
| Exchange coupon (short) | "Win fights to earn Ticks." |
| Countdown second line | "or trade ₮500 for one now →" |
| Arena header | "zero stakes — cards and Ticks are never lost, and every fight pays" |
| Purse, capped | "Daily earn cap reached — the rest keeps till tomorrow." |
| Valuation info tap | "Sum of your cards at today's prices. As rigorous as most valuations." |
| Round card | "₮300 from {investor}, at a valuation nobody verified. Terms: {term}" |
| How it works 03 | "Win fights, earn Ticks, trade Ticks for packs. Nothing is ever staked." |
| How it works 06 | "Ticks cannot be bought, and nothing can be wagered." |

## Today's Meta — the full category pool (22)

Four rotate in per UTC day, by date-hash. Formulas for cards, artifacts and
prospects are documented per line in `lib/meta.ts`.

Shitposting · Drama · Aura · Lore · Shipping · Galaxy Brain · Hype ·
Mystique · Grindset · Main Character · **Benchmarks · Burn Rate · Compute ·
Citations · Keynote · Fundraising · Pivot Speed · Staying Power · Moat ·
Discourse · Safety Posting · Demo Energy**

(The twelve in bold are new.) "Fundraising" is an opinion score for *makes
people want in*, derived from influence and momentum — it is not a claim
about any real raise.

## RAISE A ROUND v2 — the term-sheet generator (lib/rounds.ts)

Every element is seeded by ISO week: the whole world sees the same round, and
it rolls over Monday UTC. ~1 week in 6 is SPECIAL (by week-hash) and the
amount moves with the copy: **down ₮150 ("Take it →") · bridge ₮200 ("Shake
on it →") · oversubscribed ₮400 ("Sign it all →")**; every other week stays
₮300. Ceiling: an oversubscribed round day = 650 cap + 50 visit + 400 =
₮1,100 ≈ 2.2 packs, at most once every ~6 weeks. Claimed rounds append to the
CAP TABLE in the binder (last 10) — the long-running joke is your fictional
cap table filling with cursed names.

### Templates (8, rotate weekly)

1. "₮{amt} from {investor}, at a valuation nobody verified."
2. "₮{amt} from {investor}. Diligence was {diligence}."
3. "{investor} is in for ₮{amt}. They found you via {sourcing}."
4. "₮{amt} led by {investor}, who asked zero questions and answered none."
5. "Oversubscribed: {investor} AND {investor2} want in. Still ₮{amt}."
6. "₮{amt} from {investor}, wired {wiring}."
7. "{investor} offers ₮{amt} and 'as much help as you need,' which is none."
8. "₮{amt} from {investor} after a {meeting} that ran long."

### Investors (30 — all fictional, no real-firm puns; checked by hand)

Uncle Dave · Blustery Capital · Your Landlord (Diversifying) · Moist Ventures
⚠️ (gross-funny; flag if it reads crude) · The Group Chat · Dentist Money LLC ·
A Guy From The Sauna · FOMO Partners · Your Mom's Book Club Fund ⚠️ ("your
mom" is affectionate here, but it is the only investor that references the
player's family — swap for "The Book Club Fund" if it lands wrong) · Sigma
Grindset Family Office · Gut Feeling Capital · Perpetual Motion Partners ·
Diligence-Free Ventures · The Cousin Fund · Post-Rational Capital ·
Vibe-Weighted Holdings · Two Angels And A Spreadsheet · A Family Office That
Won't Name The Family · Someone's Former Manager · Slightly Bored Sovereign
Wealth · The Guy From The Conference Hallway · A Man Who Owns Several
Airports · Lukewarm Intro Capital · Napkin Math Partners · The Airport Lounge
Collective · Barely Liquid Ventures · Your Barber's Investment Club · Exit
Vibes Only LP · The Podcast Cohost · Grandma's Mattress Fund

### Terms (25)

VIBES ONLY · A NAPKIN, SIGNED · ONE WARM INTRO, PERPETUAL · PRO-RATA ON
FEELINGS · BOARD SEAT: THE DOG · LIQUIDATION PREFERENCE: DIBS · MFN WITH YOUR
COUSIN · SAFE (SORT OF) · DUE BY VIBES · NON-BINDING, LIKE EVERYTHING · NO
CAP, NO FLOOR, NO NOTES · A HANDSHAKE AT BAGGAGE CLAIM · AN OPTION POOL THAT
EATS YOU LAST · ANTI-DILUTION: ASKED NICELY · DRAG-ALONG: EMOTIONALLY ·
TAG-ALONG: TO BRUNCH · CLIFF: EVERY MONDAY · VESTING ON GOOD BEHAVIOR ·
INFORMATION RIGHTS: THE GROUP CHAT · A SIDE LETTER, LOST · PAY-TO-PLAY, VENMO
PENDING ⚠️ (names a real product; descriptive use, not a joke about Venmo —
swap for "PAYMENT PENDING" if you'd rather keep brands out entirely) · FULL
RATCHET, WHATEVER THAT IS · ROFR ON YOUR NEXT IDEA · BOARD OBSERVER: MUTED ·
EXCLUSIVITY UNTIL LUNCH

### Diligence (10)

a vibe check · one squinted look at the landing page · your LinkedIn banner
⚠️ (the NO-LINKEDIN hard rule is about data sources and roast targets; this
only jokes that an investor looked at a banner — flagged so you confirm the
boundary) · skipped entirely · outsourced to their nephew · a coin, flipped
once · three minutes of scrolling, impressed · asking around the sauna ·
reading the README's first sentence · a gut feeling, seconded by the dog

### Sourcing (10)

a reply guy · your roast receipt · a podcast at 2x · the group chat ·
misreading your bio · a screenshot of a screenshot · the wrong search result ·
your arena record · a conference lanyard they kept · an airport lounge
conversation

### Wiring (8)

eventually · in exposure first · pending one more call · to the wrong
account, then yours · in three tranches of vibes · after one more sauna · by
check, somehow · the moment you stop asking

### Meetings (8)

walk-and-talk · voice note · sauna session · Zoom with cameras off ⚠️ (Zoom
is a real product; descriptive use — swap for "video call, cameras off" if
preferred) · chance encounter at baggage claim · dinner nobody remembers
ordering · gym spot turned pitch · car ride to the airport

### Sign lines (8)

Signed. Nothing is binding. · Wire pending. Forever. · Congrats on the
dilution. · {investor} has already told three people. · The napkin is
countersigned. · Your cap table just got more interesting. · Your hoodie is
in the mail. · The announcement thread drafts itself.

### Special-week copy

DOWN (₮150): preline "Market conditions. Their words." + "₮150 from
{investor}, reluctantly." · OVERSUBSCRIBED (₮400): template 5 with two
distinct investors · BRIDGE (₮200): "₮200 from {investor}. A bridge to the
next bridge."

### Share line

"Just closed ₮{amt} from {investor}. Terms: {term}. aiticker.xyz"
