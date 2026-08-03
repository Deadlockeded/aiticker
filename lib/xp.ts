import { notifyStore } from "./binder";
import { KEYS, readRaw, writeRaw } from "./storage";
import { fireToast } from "./toast";

/**
 * Collector XP + levels, dressed as funding stages. localStorage only,
 * client-side only. XP sources: pack pulls, battles, achievements. Ticks are
 * separate (lib/wallet.ts) and buy nothing but packs — stages are for
 * flexing, not spending.
 *
 * The thresholds never changed with the rename: level = floor(xp/250)+1, and
 * a stored XP total keeps its level. Only the label moved.
 */

export const XP_PER_LEVEL = 250;

/** Level 1 → 9. Everything past IPO is Acquired, which feels correct. */
export const TITLES = [
  "Garage",
  "Pre-Seed",
  "Seed",
  "Series A",
  "Series B",
  "Unicorn",
  "Decacorn",
  "IPO'd",
  "Acquired (Derogatory)",
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
  const before = getXP();
  const next = before + amount;
  writeRaw(KEYS.xp, String(next));
  notifyStore();
  const wasLevel = levelFor(before).level;
  const nowLevel = levelFor(next).level;
  if (nowLevel > wasLevel) {
    const { title } = levelFor(next);
    fireToast("💰", `Level ${nowLevel} — ${title}`, raiseLine(nowLevel));
  }
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

/** Level-up announcement, in the register of the ladder it climbs. */
export function raiseLine(level: number): string {
  const title = TITLES[Math.min(level - 1, TITLES.length - 1)];
  switch (title) {
    case "Garage":
      return "You've founded something. It has no name yet.";
    case "Pre-Seed":
      return "You've raised a pre-seed. Congratulations on the adjective.";
    case "Unicorn":
      return "You're a unicorn. Nobody has checked the math.";
    case "Decacorn":
      return "Decacorn. The word is real now, apparently.";
    case "IPO'd":
      return "You've IPO'd. Somewhere a lock-up clock starts.";
    case "Acquired (Derogatory)":
      return "You've been acquired. Everyone says it was always the plan.";
    default:
      return `You've raised your ${title}.`;
  }
}

/** Share text for a level-up. Valuation is the player's own binder total. */
export function levelShareText(level: number, valuation: number): string {
  const title = TITLES[Math.min(level - 1, TITLES.length - 1)];
  return `My lab just reached ${title} on AIticker. Valuation: ₮${valuation.toLocaleString("en-US")}. Diligence: none. aiticker.xyz`;
}
