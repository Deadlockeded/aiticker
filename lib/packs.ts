import type { MarketCard } from "./cards";
import type { Rarity } from "./types";
import { PULL_ODDS } from "./editions";
import { CARDS_PER_PACK, getBinder, getRippedCount } from "./binder";
import { utcDayKey } from "./daily";
import { fnvHash, mulberry32 } from "./rng";

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
 * Rip one pack: CARDS_PER_PACK independent rolls over the published odds.
 * `rand` defaults to true randomness (only ever called client-side from a
 * click handler, so hydration is safe); the deterministic first-pack path
 * passes a seeded stream instead — same algorithm, same odds table.
 */
export function pullPack(cards: MarketCard[], rand: () => number = Math.random): MarketCard[] {
  const byRarity = new Map<Rarity, MarketCard[]>();
  for (const card of cards) {
    if (card.type === "artifact") continue; // artifacts have their own bucket
    byRarity.set(card.rarity, [...(byRarity.get(card.rarity) ?? []), card]);
  }

  const artifacts = cards.filter((c) => c.type === "artifact" && c.id !== "agi");
  const agi = cards.find((c) => c.id === "agi");

  const pulls: MarketCard[] = [];
  for (let i = 0; i < CARDS_PER_PACK; i++) {
    const roll = rand();
    if (agi && roll < CATEGORY_ODDS.agi) {
      pulls.push(agi);
      continue;
    }
    if (artifacts.length && roll < CATEGORY_ODDS.agi + CATEGORY_ODDS.artifact) {
      pulls.push(artifacts[Math.floor(rand() * artifacts.length)]);
      continue;
    }
    let rarity = rollRarity(rand());
    while (!byRarity.get(rarity)?.length) {
      rarity = TIERS[Math.min(TIERS.indexOf(rarity) + 1, TIERS.length - 1)];
    }
    const pool = byRarity.get(rarity)!;
    pulls.push(pool[Math.floor(rand() * pool.length)]);
  }
  return pulls;
}

/** Seeded stream for a fresh profile's Nth pack on a given UTC day. */
export function firstPackRand(dateKey: string, packNumber: number): () => number {
  return mulberry32(fnvHash(`first-pack:${dateKey}:${packNumber}`));
}

/**
 * ANTI-FISHING: a fresh profile's first two packs are derived from
 * (UTC date + pack number), so every fresh profile that day pulls the SAME
 * cards — re-rolling in incognito yields identical results, which makes
 * fishing for a hot first pack pointless. The date is inside the seed, so
 * rarity distribution across days follows the published odds (some days'
 * first packs DO contain rares — fixed per day, never systematically worse
 * than random). From the 3rd pack, or for any profile with existing
 * history, pulls are true-random. The reveal flow is identical either way
 * and no UI ever mentions this. Real anti-abuse arrives with server-side
 * inventory once Supabase auth is enabled (see README-AUTH.md).
 */
export function pullPackFor(cards: MarketCard[]): MarketCard[] {
  // consumePack() has already incremented `ripped` for this rip, so it is
  // 1-based here: 1 = the profile's first-ever pack.
  const packNumber = getRippedCount();
  // a synced/imported profile has cards before its first local rip → random
  const fresh = packNumber === 1 ? Object.keys(getBinder()).length === 0 : true;
  if (packNumber > 2 || !fresh) return pullPack(cards);
  return pullPack(cards, firstPackRand(utcDayKey(), packNumber));
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
