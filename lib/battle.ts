import { notifyStore } from "./binder";
import { utcDayKey } from "./daily";
import { KEYS, readRaw, writeRaw } from "./storage";

/**
 * Pokémon-not-poker. Best-of-3 stat clashes with a small upset factor so
 * underdogs win ~25% overall. Zero stakes: losing cards are never lost.
 * All rolls are true-random and happen client-side in event handlers.
 */

// ---- streaks ----

export interface BattleRecord {
  current: number;
  best: number;
  wins: number;
  losses: number;
  /** Ever beat an opponent rated 10+ above the fighter (Giant Slayer). */
  giantSlain?: boolean;
  /** UTC day of the most recent win — drives the first-win-of-day purse. */
  winDay?: string;
}

export function getBattleRecordSnapshot(): string {
  return readRaw(KEYS.battle) ?? '{"current":0,"best":0,"wins":0,"losses":0}';
}

export function parseBattleRecord(raw: string): BattleRecord {
  try {
    return { current: 0, best: 0, wins: 0, losses: 0, ...JSON.parse(raw) };
  } catch {
    return { current: 0, best: 0, wins: 0, losses: 0 };
  }
}

/**
 * Record a fight. Returns the new record plus `firstWinToday`, which the
 * arena purse needs (and which must be read BEFORE the write, hence the
 * combined return instead of a second helper).
 */
export function recordBattle(
  won: boolean,
  giantSlain = false,
  day = utcDayKey(),
): BattleRecord & { firstWinToday: boolean } {
  const rec = parseBattleRecord(getBattleRecordSnapshot());
  const firstWinToday = won && rec.winDay !== day;
  const next: BattleRecord = won
    ? {
        current: rec.current + 1,
        best: Math.max(rec.best, rec.current + 1),
        wins: rec.wins + 1,
        losses: rec.losses,
        giantSlain: rec.giantSlain || giantSlain,
        winDay: day,
      }
    : { ...rec, current: 0, losses: rec.losses + 1 };
  writeRaw(KEYS.battle, JSON.stringify(next));
  notifyStore();
  return { ...next, firstWinToday };
}
