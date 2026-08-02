import { notifyStore } from "./binder";
import { KEYS, readRaw, writeRaw } from "./storage";

/**
 * Collector XP + levels. localStorage only, client-side only.
 * XP sources: pack pulls, battles, daily votes, achievements. No purchases
 * exist anywhere — titles are for flexing, not spending.
 */

export const XP_PER_LEVEL = 250;

export const TITLES = [
  "Pack Fresh",
  "Binder Kid",
  "Sleeve Sniffer",
  "Foil Chaser",
  "Top Loader",
  "Slab Lord",
  "Grail Hunter",
  "Vault Dweller",
  "Mythic Magnet",
  "The Whale (ironically)",
];

export const XP_REWARDS = {
  packPull: 15,
  battleWin: 50,
  battleLoss: 10,
  dailyVote: 25,
  achievement: 50,
} as const;

export function getXPSnapshot(): string {
  return readRaw(KEYS.xp) ?? "0";
}

export function getXP(): number {
  const n = parseInt(getXPSnapshot(), 10);
  return Number.isFinite(n) ? n : 0;
}

export function addXP(amount: number): number {
  const next = getXP() + amount;
  writeRaw(KEYS.xp, String(next));
  notifyStore();
  return next;
}

export function levelFor(xp: number): {
  level: number;
  title: string;
  /** 0–1 progress toward the next level */
  progress: number;
} {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  return {
    level,
    title: TITLES[Math.min(level - 1, TITLES.length - 1)],
    progress: (xp % XP_PER_LEVEL) / XP_PER_LEVEL,
  };
}
