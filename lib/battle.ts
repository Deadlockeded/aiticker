import { notifyStore } from "./binder";

/**
 * Pokémon-not-poker. Best-of-3 stat clashes with a small upset factor so
 * underdogs win ~25% overall. Zero stakes: losing cards are never lost.
 * All rolls are true-random and happen client-side in event handlers.
 */

// ---- streaks ----

const STREAK_KEY = "ai-index:battle:v1";

export interface BattleRecord {
  current: number;
  best: number;
  wins: number;
  losses: number;
  /** Ever beat an opponent rated 10+ above the fighter (Giant Slayer). */
  giantSlain?: boolean;
}

export function getBattleRecordSnapshot(): string {
  return localStorage.getItem(STREAK_KEY) ?? '{"current":0,"best":0,"wins":0,"losses":0}';
}

export function parseBattleRecord(raw: string): BattleRecord {
  try {
    return { current: 0, best: 0, wins: 0, losses: 0, ...JSON.parse(raw) };
  } catch {
    return { current: 0, best: 0, wins: 0, losses: 0 };
  }
}

export function recordBattle(won: boolean, giantSlain = false): BattleRecord {
  const rec = parseBattleRecord(getBattleRecordSnapshot());
  const next: BattleRecord = won
    ? {
        current: rec.current + 1,
        best: Math.max(rec.best, rec.current + 1),
        wins: rec.wins + 1,
        losses: rec.losses,
        giantSlain: rec.giantSlain || giantSlain,
      }
    : { ...rec, current: 0, losses: rec.losses + 1 };
  localStorage.setItem(STREAK_KEY, JSON.stringify(next));
  notifyStore();
  return next;
}
