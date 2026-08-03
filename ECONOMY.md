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
| Casual+ (visit + 2 wins) | 300 | 1.7 | 0.60 |
| **Active (visit + 4 wins w/ a 3-streak + 1 dupe + weekly)** | **578** | **0.9** | **1.16** |
| Active+ (as above, 5 wins) | 653 | 0.8 | 1.31 |
| Grinder (caps out) | 700 | 0.7 | 1.40 |
| Grinder on round day (cap + visit + ₮300 round) | 1,000 | 0.5 | **2.00** |

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
