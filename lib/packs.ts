import type { MarketCard } from "./cards";
import type { Rarity } from "./types";
import { PULL_ODDS } from "./editions";
import { CARDS_PER_PACK } from "./binder";

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
    byRarity.set(card.rarity, [...(byRarity.get(card.rarity) ?? []), card]);
  }

  const pulls: MarketCard[] = [];
  for (let i = 0; i < CARDS_PER_PACK; i++) {
    let rarity = rollRarity(Math.random());
    // guard: if a tier has no cards, step down until one does
    while (!byRarity.get(rarity)?.length) {
      rarity = TIERS[Math.min(TIERS.indexOf(rarity) + 1, TIERS.length - 1)];
    }
    const pool = byRarity.get(rarity)!;
    pulls.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  return pulls;
}

/** Trade-in reward: one guaranteed rare-or-better, odds renormalized. */
export function pullRarePlus(cards: MarketCard[]): MarketCard {
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
