import type { MarketCard } from "./cards";
import { notifyStore } from "./binder";

/**
 * Pokémon-not-poker. Best-of-3 stat clashes with a small upset factor so
 * underdogs win ~25% overall. Zero stakes: losing cards are never lost.
 * All rolls are true-random and happen client-side in event handlers.
 */

export const BATTLE_STATS = ["innovation", "influence", "momentum"] as const;
export type BattleStat = (typeof BATTLE_STATS)[number];

export interface Round {
  stat: BattleStat;
  a: number;
  b: number;
  winner: "a" | "b";
  upset: boolean;
}

export interface BattleResult {
  rounds: Round[];
  aWins: number;
  bWins: number;
  winner: "a" | "b";
}

/** Opponent draw weighted toward similar rating. */
export function pickOpponent(cards: MarketCard[], mine: MarketCard): MarketCard {
  const pool = cards.filter((c) => c.id !== mine.id);
  const weights = pool.map((c) => 1 / (1 + Math.abs(c.rating - mine.rating) / 4));
  const total = weights.reduce((s, w) => s + w, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

export function resolveBattle(a: MarketCard, b: MarketCard): BattleResult {
  // all three stat categories, shuffled
  const stats = [...BATTLE_STATS].sort(() => Math.random() - 0.5);
  const rounds: Round[] = stats.map((stat) => {
    const av = a.stats[stat];
    const bv = b.stats[stat];
    const favored: "a" | "b" = av === bv ? (Math.random() < 0.5 ? "a" : "b") : av > bv ? "a" : "b";
    // ~18% per-round upsets ≈ underdog takes the match about a quarter of the time
    const upset = Math.random() < 0.18;
    const winner: "a" | "b" = upset ? (favored === "a" ? "b" : "a") : favored;
    return { stat, a: av, b: bv, winner, upset };
  });
  const aWins = rounds.filter((r) => r.winner === "a").length;
  return {
    rounds,
    aWins,
    bWins: rounds.length - aWins,
    winner: aWins >= 2 ? "a" : "b",
  };
}

// ---- streaks ----

const STREAK_KEY = "ai-index:battle:v1";

export interface BattleRecord {
  current: number;
  best: number;
  wins: number;
  losses: number;
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

export function recordBattle(won: boolean): BattleRecord {
  const rec = parseBattleRecord(getBattleRecordSnapshot());
  const next: BattleRecord = won
    ? {
        current: rec.current + 1,
        best: Math.max(rec.best, rec.current + 1),
        wins: rec.wins + 1,
        losses: rec.losses,
      }
    : { ...rec, current: 0, losses: rec.losses + 1 };
  localStorage.setItem(STREAK_KEY, JSON.stringify(next));
  notifyStore();
  return next;
}
