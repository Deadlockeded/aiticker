import type { MarketCard } from "./cards";
import { fnvHash, mulberry32 } from "./rng";

/**
 * Everything date-driven: hot cards, spotlight, featured card, quips of the
 * day. All picks derive from a UTC date hash so every visitor sees the same
 * thing on the same day. Date-dependent UI renders client-side only
 * (post-mount), so SSG pages never bake in a stale day.
 */

export function utcDayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** FNV-1a of a date-ish key — the app-wide deterministic picker. */
export const dayHash = fnvHash;

/** ISO-ish week key, e.g. "2026-W31". Weeks start Monday, UTC. */
export function utcWeekKey(d = new Date()): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  // Thursday of this week decides the year (ISO-8601)
  const day = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  const fDay = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - fDay + 3);
  const week =
    1 + Math.round((t.getTime() - firstThursday.getTime()) / (7 * 86_400_000));
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
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

/** Featured card of the month — month-hash pick from the index (no artifacts). */
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



