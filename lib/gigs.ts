import { utcDayKey, utcWeekKey } from "./daily";
import { notifyStore } from "./binder";
import { fnvHash, mulberry32 } from "./rng";
import { KEYS, readRaw, writeRaw } from "./storage";
import { grantTicks } from "./wallet";
import { fireToast } from "./toast";

/**
 * DAILY GIGS — the session's to-do list. Three day-seeded gigs (same board
 * for everyone, like the meta) plus one ISO-week gig. Every gig maps to an
 * EXISTING tracked action; payouts are CAPPED grants that fold inside
 * EARN_DAILY_CAP, so the board changes what a day of play looks like, not
 * how much it can pay. No retroactive credit: counters reset at the UTC
 * day boundary, same clock as packs.
 */

export type GigAction =
  | "pack_open"
  | "new_card"
  | "exchange_buy"
  | "print_open"
  | "roast_done"
  | "arena_fight"
  | "arena_win"
  | "arena_upset"
  | "crossover_fight"
  | "deck_swipe"
  | "market_visit"
  | "card_detail"
  | "binder_visit"
  | "dupe_sale"
  | "royalty_claim"
  | "scout_run"
  | "ship_run"
  | "board_clear";

export type GigCategory = "packs" | "arena" | "market" | "toys" | "binder";

export interface Gig {
  id: string;
  title: string;
  subline: string;
  action: GigAction;
  target: number;
  pay: number;
  cat: GigCategory;
  /** Completable in under a minute — every board carries at least one. */
  quick?: boolean;
}

/** The pool. Titles in-voice; sublines are the humor layer, one line each. */
export const GIG_POOL: Gig[] = [
  { id: "rip-one", title: "Rip a pack", subline: "Two cards. Infinite possibility. Mostly commons.", action: "pack_open", target: 1, pay: 25, cat: "packs", quick: true },
  { id: "rip-two", title: "Rip two packs", subline: "The second one is where the luck lives.", action: "pack_open", target: 2, pay: 40, cat: "packs" },
  { id: "fresh-face", title: "Pull someone new", subline: "A face you didn't have yesterday.", action: "new_card", target: 1, pay: 35, cat: "packs" },
  { id: "exchange", title: "Buy the Exchange Pack", subline: "Spending Ticks to make cards. The whole economy.", action: "exchange_buy", target: 1, pay: 50, cat: "packs" },
  { id: "full-print", title: "Inspect a full print", subline: "Squint at the serial. It's real.", action: "print_open", target: 1, pay: 20, cat: "packs", quick: true },
  { id: "roast-one", title: "Roast someone who deserves it", subline: "They know what they did.", action: "roast_done", target: 1, pay: 40, cat: "toys" },
  { id: "scout-stranger", title: "Scout a stranger", subline: "Every handle is a prospect. Even that one.", action: "scout_run", target: 1, pay: 35, cat: "toys" },
  { id: "ship-check", title: "Compatibility check", subline: "Science, with an asterisk the size of a door.", action: "ship_run", target: 1, pay: 35, cat: "toys" },
  { id: "take-a-fight", title: "Take a fight", subline: "Losing pays too. This is not a metaphor.", action: "arena_fight", target: 1, pay: 25, cat: "arena", quick: true },
  { id: "win-two", title: "Win 2 in the Arena", subline: "Back-to-back. The commentators are asleep.", action: "arena_win", target: 2, pay: 50, cat: "arena" },
  { id: "three-fights", title: "Fight 3 times", subline: "Win, lose, invoice.", action: "arena_fight", target: 3, pay: 55, cat: "arena" },
  { id: "upset", title: "Take an upset", subline: "Punch up. It's the whole sport.", action: "arena_upset", target: 1, pay: 60, cat: "arena" },
  { id: "crossover", title: "Fight a GitHub handle", subline: "Cards versus commits.", action: "crossover_fight", target: 1, pay: 45, cat: "arena" },
  { id: "swipe-deck", title: "Swipe the deck", subline: "Pass on cowards. Tap on victims.", action: "deck_swipe", target: 5, pay: 30, cat: "arena" },
  { id: "window-shopping", title: "Window shopping", subline: "The market is free. The cards are not.", action: "card_detail", target: 1, pay: 20, cat: "market", quick: true },
  { id: "form-guide", title: "Read the form guide", subline: "Numbers went up. Numbers went down. You watched.", action: "market_visit", target: 1, pay: 20, cat: "market", quick: true },
  { id: "liquidate", title: "Liquidate", subline: "The House always buys. That's the problem with The House.", action: "dupe_sale", target: 1, pay: 30, cat: "market" },
  { id: "bulk-sale", title: "Sell two spares", subline: "Bulk rates apply. They don't.", action: "dupe_sale", target: 2, pay: 45, cat: "market" },
  { id: "collect-mail", title: "Collect the mail", subline: "Your artifacts worked. You watched.", action: "royalty_claim", target: 1, pay: 25, cat: "binder" },
  { id: "count-assets", title: "Count your assets", subline: "They're all still there. Probably.", action: "binder_visit", target: 1, pay: 20, cat: "binder", quick: true },
];

export const BOARD_SIZE = 3;
export const BOARD_CLEAR_BONUS = 25;

/** The weekly gig pool — one per ISO week, bigger arc. */
export const WEEKLY_GIGS: Gig[] = [
  { id: "w-ten-wins", title: "Win 10 fights this week", subline: "A season in seven days.", action: "arena_win", target: 10, pay: 150, cat: "arena" },
  { id: "w-boards", title: "Clear the daily board 3 times", subline: "Show up. Then show up again.", action: "board_clear", target: 3, pay: 150, cat: "binder" },
  { id: "w-packs", title: "Rip 8 packs this week", subline: "The wrappers are biodegradable. Emotionally.", action: "pack_open", target: 8, pay: 150, cat: "packs" },
  { id: "w-roasts", title: "Serve 5 roasts this week", subline: "A tasting menu of other people's repos.", action: "roast_done", target: 5, pay: 150, cat: "toys" },
];

/**
 * Today's board: BOARD_SIZE gigs, day-seeded so the whole world shares it.
 * Variety rules: never three of one category, always at least one quick gig.
 */
export function boardFor(day = utcDayKey()): Gig[] {
  const rand = mulberry32(fnvHash(`gigs:${day}`));
  const pool = [...GIG_POOL];
  const picked: Gig[] = [];
  while (picked.length < BOARD_SIZE && pool.length > 0) {
    const idx = Math.floor(rand() * pool.length);
    const gig = pool[idx];
    const cats = picked.map((g) => g.cat);
    // never 3 of the same category
    if (cats.filter((c) => c === gig.cat).length >= 2) {
      pool.splice(idx, 1);
      continue;
    }
    // the last slot must keep the "one quick gig" promise
    if (
      picked.length === BOARD_SIZE - 1 &&
      !gig.quick &&
      !picked.some((g) => g.quick)
    ) {
      pool.splice(idx, 1);
      continue;
    }
    picked.push(gig);
    pool.splice(idx, 1);
  }
  return picked;
}

export function weeklyGigFor(week = utcWeekKey()): Gig {
  return WEEKLY_GIGS[fnvHash(`gig-week:${week}`) % WEEKLY_GIGS.length];
}

// ---- progress state -------------------------------------------------------

export interface GigState {
  day: string;
  counts: Partial<Record<GigAction, number>>;
  claimed: string[]; // gig ids claimed today
  bonusPaid: boolean; // today's board-clear bonus
  week: string;
  weekCounts: Partial<Record<GigAction, number>>;
  weekClaimed: boolean;
  /** boards cleared, kept per week key for the turf-war loyalty bonus */
  boardsCleared: Record<string, number>;
}

export function parseGigs(raw: string | null): GigState {
  const day = utcDayKey();
  const week = utcWeekKey();
  const fresh: GigState = {
    day, counts: {}, claimed: [], bonusPaid: false,
    week, weekCounts: {}, weekClaimed: false, boardsCleared: {},
  };
  if (!raw) return fresh;
  try {
    const s = JSON.parse(raw) as GigState;
    const boards: Record<string, number> = {};
    // keep only the current + previous week (dividend bonus lookback)
    for (const [w, n] of Object.entries(s.boardsCleared ?? {})) {
      if (typeof n === "number") boards[w] = n;
    }
    const sameDay = s.day === day;
    const sameWeek = s.week === week;
    return {
      day,
      counts: sameDay ? (s.counts ?? {}) : {},
      claimed: sameDay ? (s.claimed ?? []) : [],
      bonusPaid: sameDay ? Boolean(s.bonusPaid) : false,
      week,
      weekCounts: sameWeek ? (s.weekCounts ?? {}) : {},
      weekClaimed: sameWeek ? Boolean(s.weekClaimed) : false,
      boardsCleared: boards,
    };
  } catch {
    return fresh;
  }
}

/** "" = hydrated but empty; the server snapshot alone returns null. */
export function getGigsSnapshot(): string | null {
  return readRaw(KEYS.gigs) ?? "";
}

function writeGigs(s: GigState) {
  writeRaw(KEYS.gigs, JSON.stringify(s));
  notifyStore();
}

/** Record an action. Cheap and unconditional — the board decides what pays. */
export function trackGig(action: GigAction, n = 1) {
  const s = parseGigs(readRaw(KEYS.gigs));
  s.counts[action] = (s.counts[action] ?? 0) + n;
  s.weekCounts[action] = (s.weekCounts[action] ?? 0) + n;
  writeGigs(s);
}

export function gigProgress(gig: Gig, s: GigState, weekly = false): number {
  const src = weekly ? s.weekCounts : s.counts;
  return Math.min(gig.target, src[gig.action] ?? 0);
}

/** Claim a completed daily gig. Idempotent; returns Ticks actually paid. */
export function claimGig(id: string): number {
  const s = parseGigs(readRaw(KEYS.gigs));
  const gig = boardFor(s.day).find((g) => g.id === id);
  if (!gig || s.claimed.includes(id)) return 0;
  if (gigProgress(gig, s) < gig.target) return 0;
  s.claimed.push(id);
  let paid = grantTicks(gig.pay, { reason: gig.title });
  // full board → the clear bonus, stamped once, counted for the week
  if (!s.bonusPaid && boardFor(s.day).every((g) => s.claimed.includes(g.id))) {
    s.bonusPaid = true;
    s.boardsCleared[s.week] = (s.boardsCleared[s.week] ?? 0) + 1;
    s.weekCounts.board_clear = (s.weekCounts.board_clear ?? 0) + 1;
    paid += grantTicks(BOARD_CLEAR_BONUS, { reason: "board cleared", silent: true });
    fireToast("🧾", `Board cleared · +₮${BOARD_CLEAR_BONUS} bonus`, "");
  }
  writeGigs(s);
  return paid;
}

/** Claim the weekly gig. Idempotent; returns Ticks actually paid. */
export function claimWeeklyGig(): number {
  const s = parseGigs(readRaw(KEYS.gigs));
  const gig = weeklyGigFor(s.week);
  if (s.weekClaimed || gigProgress(gig, s, true) < gig.target) return 0;
  s.weekClaimed = true;
  writeGigs(s);
  return grantTicks(gig.pay, { reason: gig.title });
}

/** Boards cleared in a given ISO week — the turf-war loyalty bonus hook. */
export function boardsClearedIn(week: string, s = parseGigs(readRaw(KEYS.gigs))): number {
  return s.boardsCleared[week] ?? 0;
}
