import type { MarketCard } from "./cards";
import type { Rarity } from "./types";
import { PULL_ODDS } from "./editions";
import { CARDS_PER_PACK } from "./binder";

/**
 * Category odds per card slot. Artifacts fatten the common pool (~35%)
 * so legendary people feel mythic; AGI is the 0.1% secret. People/company
 * rarity odds are compressed into the remaining probability.
 */
export const CATEGORY_ODDS = {
  agi: 0.001,
  artifact: 0.35,
  common: 0.352,
  rare: 0.22,
  epic: 0.065,
  legendary: 0.012,
} as const;

/** Display odds for a card's tier, per card slot — "1.2%" etc. */
export function oddsLabelFor(card: { id: string; type: string; rarity: string }): string {
  const v =
    card.id === "agi"
      ? CATEGORY_ODDS.agi
      : card.type === "artifact"
        ? CATEGORY_ODDS.artifact
        : (CATEGORY_ODDS as Record<string, number>)[card.rarity] ?? CATEGORY_ODDS.common;
  return `${(v * 100).toFixed(1).replace(/\.0$/, "")}%`;
}

const TIERS: Rarity[] = ["mythic", "legendary", "epic", "rare", "common"];

function rollRarity(roll: number): Rarity {
  let cumulative = 0;
  // walk from common upward so the big buckets absorb most rolls
  for (const rarity of [...TIERS].reverse()) {
    cumulative += PULL_ODDS[rarity];
    if (roll < cumulative) return rarity;
  }
  return "common";
}

/**
 * Rip one pack: CARDS_PER_PACK independent rolls. True random on purpose —
 * only ever called client-side from a click handler, so hydration is safe.
 */
export function pullPack(cards: MarketCard[]): MarketCard[] {
  const byRarity = new Map<Rarity, MarketCard[]>();
  for (const card of cards) {
    if (card.type === "artifact") continue; // artifacts have their own bucket
    byRarity.set(card.rarity, [...(byRarity.get(card.rarity) ?? []), card]);
  }

  const artifacts = cards.filter((c) => c.type === "artifact" && c.id !== "agi");
  const agi = cards.find((c) => c.id === "agi");

  const pulls: MarketCard[] = [];
  for (let i = 0; i < CARDS_PER_PACK; i++) {
    const roll = Math.random();
    if (agi && roll < CATEGORY_ODDS.agi) {
      pulls.push(agi);
      continue;
    }
    if (artifacts.length && roll < CATEGORY_ODDS.agi + CATEGORY_ODDS.artifact) {
      pulls.push(artifacts[Math.floor(Math.random() * artifacts.length)]);
      continue;
    }
    let rarity = rollRarity(Math.random());
    while (!byRarity.get(rarity)?.length) {
      rarity = TIERS[Math.min(TIERS.indexOf(rarity) + 1, TIERS.length - 1)];
    }
    const pool = byRarity.get(rarity)!;
    pulls.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  return pulls;
}

/** Trade-in reward: one guaranteed rare-or-better, odds renormalized. */
export function pullRarePlus(allCards: MarketCard[]): MarketCard {
  const cards = allCards.filter((c) => c.type !== "artifact");
  const tiers: Rarity[] = ["rare", "epic", "legendary", "mythic"];
  const total = tiers.reduce((s, t) => s + PULL_ODDS[t], 0);
  let roll = Math.random() * total;
  let rarity: Rarity = "rare";
  for (const tier of [...tiers].reverse()) {
    roll -= PULL_ODDS[tier];
    if (roll < 0) {
      rarity = tier;
      break;
    }
  }
  let pool = cards.filter((c) => c.rarity === rarity);
  if (pool.length === 0) pool = cards.filter((c) => c.rarity === "rare");
  return pool[Math.floor(Math.random() * pool.length)];
}
