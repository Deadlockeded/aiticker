import housesJson from "../data/houses.json";
import turfwarJson from "../data/turfwar.json";
import type { MarketCard } from "./cards";
import { utcWeekKey } from "./daily";
import { notifyStore } from "./binder";
import { boardsClearedIn } from "./gigs";
import { KEYS, readRaw, writeRaw } from "./storage";
import { grantTicks } from "./wallet";

/**
 * THE FAMILIES — allegiance without fabrication. A House is a set of REAL
 * index cards (the entity + people whose card careers place them there);
 * its weekly fortune is the average 7-day price change of those cards —
 * data the nightly pipeline already commits. Mottos and flavor are the
 * game's voice, never quotes or claims about the real organisations.
 * Solo-safe: scoring reads prices, never player counts.
 */

export interface House {
  id: string;
  name: string;
  motto: string;
  tint: "pink" | "teal" | "violet" | "amber" | "ink";
  cards: string[];
}

export const HOUSES = housesJson as House[];

export function houseById(id: string | null | undefined): House | null {
  return HOUSES.find((h) => h.id === id) ?? null;
}

// ---- weekly turf war (finalized by the nightly pipeline) ------------------

export interface TurfWeek {
  week: string;
  standings: { houseId: string; score: number; rank: number }[];
  winner: string;
}

/** Finalized weeks, newest last — committed by scripts/update-market.ts. */
export const TURF_WEEKS = turfwarJson as TurfWeek[];

export function latestTurfWeek(): TurfWeek | null {
  return TURF_WEEKS[TURF_WEEKS.length - 1] ?? null;
}

/** Live "this week so far": average member 7-day move from committed prices. */
export function liveHouseScore(house: House, cards: MarketCard[]): number {
  const members = cards.filter((c) => house.cards.includes(c.id));
  if (members.length === 0) return 0;
  const move = (c: MarketCard) => {
    const h = c.priceHistory;
    const prev = h[Math.max(0, h.length - 8)].price;
    return ((h[h.length - 1].price - prev) / prev) * 100;
  };
  return members.reduce((s, c) => s + move(c), 0) / members.length;
}

// ---- dividends ------------------------------------------------------------

export const DIVIDENDS = { first: 120, second: 80, others: 40 } as const;
/** Personal bonus for clearing ≥3 daily boards in the scored week. */
export const LOYALTY_BONUS = 30;
export const LOYALTY_BOARDS = 3;

export function dividendFor(rank: number): number {
  return rank === 1 ? DIVIDENDS.first : rank === 2 ? DIVIDENDS.second : DIVIDENDS.others;
}

// ---- pledge state ---------------------------------------------------------

export const DEFECT_COOLDOWN_DAYS = 14;

export interface PledgeState {
  houseId: string | null;
  pledgedAt: string | null; // ISO date of the current pledge
  /** The one-time PICK YOUR HOUSE sheet was shown (or skipped). */
  prompted: boolean;
  claimedWeeks: string[]; // turf-war weeks already paid, rolling
}

export function parsePledge(raw: string | null): PledgeState {
  const fresh: PledgeState = { houseId: null, pledgedAt: null, prompted: false, claimedWeeks: [] };
  if (!raw) return fresh;
  try {
    const s = JSON.parse(raw) as Partial<PledgeState>;
    return {
      houseId: typeof s.houseId === "string" ? s.houseId : null,
      pledgedAt: typeof s.pledgedAt === "string" ? s.pledgedAt : null,
      prompted: Boolean(s.prompted),
      claimedWeeks: Array.isArray(s.claimedWeeks) ? s.claimedWeeks.slice(-12) : [],
    };
  } catch {
    return fresh;
  }
}

/** "" = hydrated but empty; the server snapshot alone returns null. */
export function getPledgeSnapshot(): string | null {
  return readRaw(KEYS.house) ?? "";
}

export function getPledge(): PledgeState {
  return parsePledge(readRaw(KEYS.house));
}

function writePledge(s: PledgeState) {
  writeRaw(KEYS.house, JSON.stringify(s));
  notifyStore();
}

export function markHousePrompted() {
  writePledge({ ...getPledge(), prompted: true });
}

/** Days until defection is allowed again; 0 = free to move. */
export function defectCooldownLeft(s = getPledge(), now = Date.now()): number {
  if (!s.houseId || !s.pledgedAt) return 0;
  const days = (now - Date.parse(s.pledgedAt)) / 86_400_000;
  return Math.max(0, Math.ceil(DEFECT_COOLDOWN_DAYS - days));
}

/** Pledge (or defect to) a House. Returns false while the cooldown holds. */
export function pledgeHouse(houseId: string, now = Date.now()): boolean {
  const s = getPledge();
  if (s.houseId === houseId) return true;
  if (s.houseId && defectCooldownLeft(s, now) > 0) return false;
  writePledge({
    ...s,
    houseId,
    pledgedAt: new Date(now).toISOString(),
    prompted: true,
  });
  return true;
}

// ---- the weekly cut -------------------------------------------------------

export interface Cut {
  week: string;
  house: House;
  rank: number;
  score: number;
  winner: House;
  winnerScore: number;
  dividend: number;
  loyalty: number;
  total: number;
}

/** The unclaimed cut from the latest finalized week, if any. */
export function pendingCut(s = getPledge()): Cut | null {
  const wk = latestTurfWeek();
  if (!wk || !s.houseId) return null;
  if (s.claimedWeeks.includes(wk.week)) return null;
  if (wk.week === utcWeekKey()) return null; // never pay a week still running
  const mine = wk.standings.find((r) => r.houseId === s.houseId);
  const winner = houseById(wk.winner);
  const house = houseById(s.houseId);
  if (!mine || !winner || !house) return null;
  const dividend = dividendFor(mine.rank);
  const loyalty = boardsClearedIn(wk.week) >= LOYALTY_BOARDS ? LOYALTY_BONUS : 0;
  return {
    week: wk.week,
    house,
    rank: mine.rank,
    score: mine.score,
    winner,
    winnerScore: wk.standings.find((r) => r.houseId === wk.winner)?.score ?? 0,
    dividend,
    loyalty,
    total: dividend + loyalty,
  };
}

/** Claim the pending cut. Idempotent; returns Ticks actually paid. */
export function claimCut(): number {
  const s = getPledge();
  const cut = pendingCut(s);
  if (!cut) return 0;
  writePledge({ ...s, claimedWeeks: [...s.claimedWeeks, cut.week].slice(-12) });
  let paid = grantTicks(cut.dividend, { reason: `turf war · ${cut.house.name}` });
  if (cut.loyalty > 0) {
    paid += grantTicks(cut.loyalty, { reason: "loyalty stipend", silent: true });
  }
  return paid;
}

/** The pledged House's short name for share images ("DEEPSEEK"), or null. */
export function pledgedHouseShortName(): string | null {
  const h = houseById(getPledge().houseId);
  return h ? h.name.replace("House ", "").toUpperCase() : null;
}

export function cutShareText(cut: Cut): string {
  return `${cut.winner.name} took the week. I'm owed ₮${cut.total} and emotional satisfaction. aiticker.xyz`;
}
