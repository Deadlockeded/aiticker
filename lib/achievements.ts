import achievements from "@/data/achievements.json";
import type { MarketCard } from "./cards";
import { getBinder, notifyStore } from "./binder";
import { getBattleRecordSnapshot, parseBattleRecord } from "./battle";
import { addXP, getXP, XP_REWARDS } from "./xp";

export interface Achievement {
  id: string;
  name: string;
  emoji: string;
  desc: string;
}

export const ACHIEVEMENTS = achievements as Achievement[];

const KEY = "ai-index:achievements:v1";
export const TOAST_EVENT = "ai-index:toast";

export function getUnlockedSnapshot(): string {
  return localStorage.getItem(KEY) ?? "[]";
}

export function parseUnlocked(raw: string): string[] {
  try {
    const list = JSON.parse(raw) as string[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

const DOOMERS = ["geoffrey-hinton", "yoshua-bengio", "stuart-russell", "eliezer-yudkowsky"];

/** Hidden trophy: beating anything WITH an artifact. One per artifact. */
export function unlockArtifactWin(card: { id: string; name: string }): void {
  const id = `artifact-win-${card.id}`;
  const unlocked = parseUnlocked(getUnlockedSnapshot());
  if (unlocked.includes(id)) return;
  localStorage.setItem(KEY, JSON.stringify([...unlocked, id]));
  notifyStore();
  addXP(XP_REWARDS.achievement);
  window.dispatchEvent(
    new CustomEvent(TOAST_EVENT, {
      detail: {
        emoji: "◆",
        title: "Hidden trophy",
        body: `Defeated a legend with ${card.name}. +${XP_REWARDS.achievement} XP`,
      },
    }),
  );
}

/**
 * Evaluate every badge against current localStorage state and unlock the new
 * ones (toast + XP each). Call after pulls and Arena fights.
 */
export function checkAchievements(cards: MarketCard[]): Achievement[] {
  const binder = getBinder();
  const owned = Object.keys(binder);
  const record = parseBattleRecord(getBattleRecordSnapshot());
  const totalCopies = Object.values(binder).reduce((s, e) => s + e.copies, 0);

  const satisfied: Record<string, boolean> = {
    "first-pull": owned.length > 0,
    "first-blood": record.wins >= 1,
    "hot-hand": record.current >= 3 || record.best >= 3,
    "giant-slayer": record.giantSlain === true,
    "arena-veteran": record.wins >= 10,
    "pack-rat": totalCopies >= 30,
    "doomer-deck": DOOMERS.every((id) => owned.includes(id)),
    "level-5": getXP() >= 1000,
    "full-set": owned.length >= cards.length,
  };

  const unlocked = parseUnlocked(getUnlockedSnapshot());
  const fresh = ACHIEVEMENTS.filter(
    (a) => satisfied[a.id] && !unlocked.includes(a.id),
  );
  if (fresh.length === 0) return [];

  localStorage.setItem(
    KEY,
    JSON.stringify([...unlocked, ...fresh.map((a) => a.id)]),
  );
  notifyStore();
  for (const a of fresh) {
    addXP(XP_REWARDS.achievement);
    window.dispatchEvent(
      new CustomEvent(TOAST_EVENT, {
        detail: {
          emoji: a.emoji,
          title: `Achievement: ${a.name}`,
          body: `${a.desc} +${XP_REWARDS.achievement} XP`,
        },
      }),
    );
  }
  return fresh;
}
