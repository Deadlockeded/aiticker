import { utcDayKey, utcWeekKey } from "./daily";
import { DAILY_VISIT_TICKS } from "./economy";
import {
  capTableWith,
  generateRound,
  type CapTableRow,
  type WeeklyRound,
} from "./rounds";
import { KEYS, readJSON, readRaw, writeJSON, writeRaw } from "./storage";
import { grantTicks } from "./wallet";

/**
 * The two claimable rituals: showing up (daily) and RAISE A ROUND (weekly).
 * Both are Tick grants, both idempotent per period, and neither can be lost —
 * see the hard rules in economy.ts. Round copy comes from lib/rounds.ts.
 */

export { utcWeekKey };

interface Rituals {
  /** UTC day key of the last daily-visit grant. */
  visit?: string;
  /** ISO week key of the last claimed round. */
  round?: string;
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

export type Round = WeeklyRound;

/** This week's term sheet — same for everyone, rolls over Monday UTC. */
export function getRound(week = utcWeekKey()): Round {
  return generateRound(week);
}

export function roundClaimedFrom(raw: string, week = utcWeekKey()): boolean {
  return parseRituals(raw).round === week;
}

/** Past claimed rounds — the fictional cap table, newest last, max 10. */
export function getCapTable(): CapTableRow[] {
  const rows = readJSON<CapTableRow[]>(KEYS.capTable, []);
  return Array.isArray(rows) ? rows : [];
}

/**
 * Claim this week's round. Special weeks pay their own amount (down ₮150,
 * bridge ₮200, oversubscribed ₮400 — see rounds.ts). Returns Ticks granted
 * (0 if already claimed). Rituals are exempt from the daily earn clip.
 */
export function claimRound(week = utcWeekKey()): number {
  const r = parseRituals(getRitualsSnapshot());
  if (r.round === week) return 0;
  const round = generateRound(week);
  write({ ...r, round: week });
  writeJSON(
    KEYS.capTable,
    capTableWith(getCapTable(), {
      week,
      investor: round.investor,
      amount: round.amount,
    }),
  );
  return grantTicks(round.amount, { reason: "this week's round", capped: false });
}
