import type { MarketCard } from "./cards";
import { notifyStore } from "./binder";

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

/** Same card for everyone each day, drawn from the curated blurb pool. */
export function getDailyCard(cards: MarketCard[], key = utcDayKey()): MarketCard {
  const pool = cards.filter((c) => c.dailyBlurb);
  return pool[dayHash(key) % pool.length];
}

/** Two cards run hot each day: flame badge + "+3" shown everywhere. */
export function getHotCards(cards: MarketCard[], key = utcDayKey()): MarketCard[] {
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

/** Which prediction runs today. */
export function getPredictionIndex(poolSize: number, key = utcDayKey()): number {
  return dayHash(`predict:${key}`) % poolSize;
}

/** Fake community vote split — seeded from the date, sums to 100. */
export function fakeCommunityPct(optionCount: number, key = utcDayKey()): number[] {
  const rand = mulberry32(dayHash(`community:${key}`));
  const weights = Array.from({ length: optionCount }, () => 0.15 + rand());
  const total = weights.reduce((s, w) => s + w, 0);
  const pcts = weights.map((w) => Math.round((w / total) * 100));
  const drift = 100 - pcts.reduce((s, p) => s + p, 0);
  pcts[0] += drift;
  return pcts;
}

// ---- votes ----

const VOTES_KEY = "ai-index:votes:v1";

export function getVotesSnapshot(): string {
  return localStorage.getItem(VOTES_KEY) ?? "{}";
}

export function parseVotes(raw: string): Record<string, number> {
  try {
    return JSON.parse(raw) as Record<string, number>;
  } catch {
    return {};
  }
}

export function voteToday(optionIndex: number): void {
  const votes = parseVotes(getVotesSnapshot());
  votes[utcDayKey()] = optionIndex;
  localStorage.setItem(VOTES_KEY, JSON.stringify(votes));
  notifyStore();
}

// ---- visit streak ----

const VISITS_KEY = "ai-index:visits:v1";

export interface VisitStreak {
  last: string;
  current: number;
  best: number;
}

export function getVisitsSnapshot(): string {
  return localStorage.getItem(VISITS_KEY) ?? '{"last":"","current":0,"best":0}';
}

export function parseVisits(raw: string): VisitStreak {
  try {
    return { last: "", current: 0, best: 0, ...JSON.parse(raw) };
  } catch {
    return { last: "", current: 0, best: 0 };
  }
}

/** Bump the consecutive-day streak. Idempotent within a day. */
export function recordVisit(): VisitStreak {
  const visits = parseVisits(getVisitsSnapshot());
  const today = utcDayKey();
  if (visits.last === today) return visits;
  const yesterday = utcDayKey(new Date(Date.now() - 86_400_000));
  const current = visits.last === yesterday ? visits.current + 1 : 1;
  const next = { last: today, current, best: Math.max(visits.best, current) };
  localStorage.setItem(VISITS_KEY, JSON.stringify(next));
  notifyStore();
  return next;
}
