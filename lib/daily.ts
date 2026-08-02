import type { MarketCard } from "./cards";

/**
 * Everything date-driven: daily card, daily prediction, hot streaks, visit
 * streaks. All picks derive from a UTC date hash so every visitor sees the
 * same thing on the same day. Date-dependent UI renders client-side only
 * (post-mount), so SSG pages never bake in a stale day.
 */

export function utcDayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function dayHash(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}


/**
 * Two cards run hot each day: flame badge + "+3" shown everywhere.
 * With pipeline data present, hot = top 2 by real Wikipedia attentionDelta
 * (deterministic from committed JSON); otherwise date-hash fallback.
 */
export function getHotCards(cards: MarketCard[], key = utcDayKey()): MarketCard[] {
  const withDelta = cards.filter(
    (c) => typeof c.signals?.attentionDelta === "number",
  );
  if (withDelta.length >= 2) {
    return [...withDelta]
      .sort((a, b) => b.signals!.attentionDelta! - a.signals!.attentionDelta!)
      .slice(0, 2);
  }
  const rand = mulberry32(dayHash(`hot:${key}`));
  const first = Math.floor(rand() * cards.length);
  let second = Math.floor(rand() * (cards.length - 1));
  if (second >= first) second++;
  return [cards[first], cards[second]];
}

export function isHot(cardId: string, cards: MarketCard[], key = utcDayKey()): boolean {
  return getHotCards(cards, key).some((c) => c.id === cardId);
}

/** Temporary rating boost shown on hot cards (display only, never sorts). */
export const HOT_BOOST = 3;

/** Launch epoch for issue numbering (weeks since). */
export const LAUNCH_EPOCH = "2026-08-01";

export function issueNumber(now = new Date()): number {
  return Math.max(1, Math.floor((now.getTime() - Date.parse(LAUNCH_EPOCH)) / (7 * 86_400_000)) + 1);
}

/** Cover star of the month — month-hash pick from the index (no artifacts). */
export function getCoverStar(cards: MarketCard[], now = new Date()): MarketCard {
  const pool = cards.filter((c) => c.type !== "artifact");
  const key = `${now.getUTCFullYear()}-${now.getUTCMonth()}`;
  return pool[dayHash(`cover:${key}`) % pool.length];
}

/** Quip of the day — same for everyone, rotates with the UTC date. */
export function getDailyQuip(card: MarketCard, key = utcDayKey()): string | null {
  if (!card.quips?.length) return null;
  return card.quips[dayHash(`quip:${key}:${card.id}`) % card.quips.length];
}

/** Client-side random quip (pack flips, arena entrances). */
export function getRandomQuip(card: MarketCard): string | null {
  if (!card.quips?.length) return null;
  return card.quips[Math.floor(Math.random() * card.quips.length)];
}



