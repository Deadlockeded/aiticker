import type { MarketCard } from "./cards";
import { dayHash, utcDayKey } from "./daily";
import { isReleased } from "./drops";
import { mulberry32 } from "./rng";

/**
 * THE DEALER — builds the Arena's Challenger Line.
 *
 * The old deck sorted by rating proximity, so it served the same faces in the
 * same order every session. The dealer shuffles per session and then applies
 * variety constraints in priority order:
 *
 *   1. NO REPEATS until the eligible pool is exhausted (the caller tracks
 *      served ids; exhaustion reshuffles with a "Fresh deck." toast).
 *   2. TYPE ALTERNATION — never more than 2 consecutive challengers of the
 *      same type (engineer / company / artifact).
 *   3. RATING MIX — beatable / stretch / upset-bait interleaved ~40/35/25, so
 *      a boss turns up often enough to keep swiping tense.
 *   4. SMALL-BINDER BIAS — under 5 cards, the mix tilts to beatable so a new
 *      collector's first Arena isn't a wall.
 *
 * The seed is (UTC date + session nonce): reloading mid-session keeps your
 * place, tomorrow deals differently. All randomness comes from mulberry32 —
 * never Math.random inside render.
 */

export type Band = "beatable" | "stretch" | "boss";

/** Target share of each band in a normal deck, and in a beginner's deck. */
const MIX: Record<Band, number> = { beatable: 0.4, stretch: 0.35, boss: 0.25 };
const SMALL_BINDER_MIX: Record<Band, number> = { beatable: 0.65, stretch: 0.28, boss: 0.07 };
export const SMALL_BINDER = 5;

/** Where a challenger sits relative to your best card. */
export function bandFor(challengerRating: number, myBest: number): Band {
  const gap = challengerRating - myBest;
  if (gap < -3) return "beatable";
  if (gap <= 10) return "stretch";
  return "boss";
}

export function typeOf(card: MarketCard): string {
  return card.type === "artifact" ? "artifact" : card.type === "company" ? "company" : "engineer";
}

/** Fisher–Yates with a seeded RNG — deterministic for a given seed. */
function shuffle<T>(items: T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * TODAY'S CHALLENGER — the same card for everyone, all day. Shared experience
 * is the point, so this is a pure date hash over the released pool and never
 * touches the session seed.
 */
export function dailySpotlight(
  pool: MarketCard[],
  dateKey = utcDayKey(),
): MarketCard | null {
  const eligible = pool.filter((c) => c.id !== "agi" && isReleased(c.id));
  if (eligible.length === 0) return null;
  const ordered = [...eligible].sort((a, b) => a.id.localeCompare(b.id));
  return ordered[dayHash(`spotlight:${dateKey}`) % ordered.length];
}

export interface DealOptions {
  /** Every card that could be dealt (released filter applied inside). */
  pool: MarketCard[];
  /** The fighter's rating — bands are measured against it. */
  myRating: number;
  /** Cards already served this session; excluded until the pool is dry. */
  served?: Set<string>;
  /** Number of cards in the player's binder — drives the beginner bias. */
  binderSize: number;
  /** Session seed (date + nonce). Same seed → same deck. */
  seed: number;
  /** Exclude the fighter itself. */
  excludeId?: string;
  /**
   * Pin TODAY'S CHALLENGER to the front. True for the session's opening deal
   * (everyone starts on the same card); false once the player has asked for a
   * reshuffle — by then the shared moment has happened, and pinning it again
   * would make NEW OPPONENT look broken.
   */
  spotlightFirst?: boolean;
  dateKey?: string;
}

/**
 * Deal the Challenger Line. Returns the ordered deck; the daily spotlight is
 * always first (when it is still eligible) so everyone opens on the same card.
 */
export function dealChallengers({
  pool,
  myRating,
  served = new Set(),
  binderSize,
  seed,
  excludeId,
  spotlightFirst = true,
  dateKey = utcDayKey(),
}: DealOptions): MarketCard[] {
  const eligible = pool.filter(
    (c) => c.id !== "agi" && c.id !== excludeId && isReleased(c.id),
  );
  if (eligible.length === 0) return [];

  // 1. no repeats until the pool is exhausted
  const fresh = eligible.filter((c) => !served.has(c.id));
  const usable = fresh.length > 0 ? fresh : eligible;

  const rand = mulberry32(seed || 1);
  const mix = binderSize < SMALL_BINDER ? SMALL_BINDER_MIX : MIX;

  // 3. bucket by band, each bucket shuffled
  const buckets: Record<Band, MarketCard[]> = {
    beatable: [],
    stretch: [],
    boss: [],
  };
  for (const card of shuffle(usable, rand)) {
    buckets[bandFor(card.rating, myRating)].push(card);
  }

  // draw bands by weighted lottery so the deck alternates instead of blocking
  const deck: MarketCard[] = [];
  const typeRun: string[] = [];
  const bands: Band[] = ["beatable", "stretch", "boss"];

  /** Type currently barred: the last two dealt cards shared a type. */
  const barred = (): string | null =>
    typeRun.length >= 2 && typeRun[0] === typeRun[1] ? typeRun[0] : null;

  /** Take from a band, honouring the type bar. Returns null if it cannot. */
  const takeFrom = (band: Band, respectBar = true): MarketCard | null => {
    const bucket = buckets[band];
    if (bucket.length === 0) return null;
    const bar = respectBar ? barred() : null;
    const idx = bar ? bucket.findIndex((c) => typeOf(c) !== bar) : 0;
    if (idx === -1) return null;
    return bucket.splice(idx, 1)[0];
  };

  // Beginner bias: bosses are held back to the tail entirely, so a new
  // collector meets winnable cards first and still has the ladder waiting.
  const heldBosses = binderSize < SMALL_BINDER ? buckets.boss.splice(0) : [];

  while (buckets.beatable.length + buckets.stretch.length + buckets.boss.length > 0) {
    const live = bands.filter((b) => buckets[b].length > 0);
    const total = live.reduce((s, b) => s + mix[b], 0);
    let roll = rand() * total;
    let chosen = live[live.length - 1];
    for (const b of live) {
      roll -= mix[b];
      if (roll <= 0) {
        chosen = b;
        break;
      }
    }
    // Honour the type bar across EVERY live band before breaking it — a run
    // of 3 is only dealt when literally nothing else remains. This must stay
    // lazy: a .map() here would splice a card out of every bucket and throw
    // all but the first away.
    let card = takeFrom(chosen);
    if (!card) {
      for (const b of live) {
        card = takeFrom(b);
        if (card) break;
      }
    }
    if (!card) {
      for (const b of live) {
        card = takeFrom(b, false);
        if (card) break;
      }
    }
    if (!card) break;
    deck.push(card);
    typeRun.unshift(typeOf(card));
    typeRun.length = Math.min(typeRun.length, 2);
  }
  deck.push(...shuffle(heldBosses, rand));

  // 4. today's challenger opens the deck, for everyone
  const spotlight = spotlightFirst ? dailySpotlight(eligible, dateKey) : null;
  if (spotlight && !served.has(spotlight.id)) {
    const at = deck.findIndex((c) => c.id === spotlight.id);
    if (at > 0) deck.splice(at, 1);
    if (at !== 0) deck.unshift(spotlight);
    // moving it to the front can create a run of 3 behind it; nudge the
    // offender back one slot rather than re-dealing the whole line
    for (let i = 2; i < deck.length; i++) {
      if (typeOf(deck[i]) === typeOf(deck[i - 1]) && typeOf(deck[i]) === typeOf(deck[i - 2])) {
        const swap = deck.findIndex((c, j) => j > i && typeOf(c) !== typeOf(deck[i]));
        if (swap === -1) break;
        [deck[i], deck[swap]] = [deck[swap], deck[i]];
      }
    }
  }
  return deck;
}

/** Session seed: stable across reloads within a day+nonce, new tomorrow. */
export function dealerSeed(nonce: number, dateKey = utcDayKey()): number {
  return dayHash(`dealer:${dateKey}:${nonce}`);
}
