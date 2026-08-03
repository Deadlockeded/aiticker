import { fnvHash } from "./rng";
import { utcDayKey } from "./daily";
import { DAILY_VISIT_TICKS, WEEKLY_ROUND_TICKS } from "./economy";
import { INVESTORS, ROUND_TERMS } from "./lines";
import { KEYS, readRaw, writeRaw } from "./storage";
import { grantTicks } from "./wallet";

/**
 * The two claimable rituals: showing up (daily) and RAISE A ROUND (weekly).
 * Both are Tick grants, both are idempotent per period, and neither can be
 * lost — see the hard rules in economy.ts.
 */

interface Rituals {
  /** UTC day key of the last daily-visit grant. */
  visit?: string;
  /** ISO week key of the last claimed round. */
  round?: string;
}

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

export function getRitualsSnapshot(): string {
  return readRaw(KEYS.rituals) ?? "";
}

export function parseRituals(raw: string): Rituals {
  try {
    const p = JSON.parse(raw) as Rituals;
    return p && typeof p === "object" ? p : {};
  } catch {
    return {};
  }
}

function write(r: Rituals) {
  writeRaw(KEYS.rituals, JSON.stringify(r));
}

/**
 * Grant the daily visit stipend once per UTC day. Called at boot; returns the
 * amount granted (0 when already claimed today).
 */
export function claimDailyVisit(day = utcDayKey()): number {
  const r = parseRituals(getRitualsSnapshot());
  if (r.visit === day) return 0;
  write({ ...r, visit: day });
  return grantTicks(DAILY_VISIT_TICKS, { reason: "daily visit", capped: false });
}

// ---- RAISE A ROUND --------------------------------------------------------

export interface Round {
  week: string;
  investor: string;
  term: string;
  amount: number;
}

/**
 * This week's term sheet. Investor and terms are deterministic from the week
 * key, so everyone sees the same absurd round — and every name in the pool is
 * FICTIONAL (see the hard rule in lines.ts).
 */
export function getRound(week = utcWeekKey()): Round {
  return {
    week,
    investor: INVESTORS[fnvHash(`round-investor:${week}`) % INVESTORS.length],
    term: ROUND_TERMS[fnvHash(`round-term:${week}`) % ROUND_TERMS.length],
    amount: WEEKLY_ROUND_TICKS,
  };
}

export function roundClaimedFrom(raw: string, week = utcWeekKey()): boolean {
  return parseRituals(raw).round === week;
}

/** Claim this week's round. Returns the Ticks granted (0 if already claimed). */
export function claimRound(week = utcWeekKey()): number {
  const r = parseRituals(getRitualsSnapshot());
  if (r.round === week) return 0;
  write({ ...r, round: week });
  return grantTicks(WEEKLY_ROUND_TICKS, { reason: "this week's round", capped: false });
}
