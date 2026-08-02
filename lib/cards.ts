import type { Card } from "./types";
import { computeRating } from "./rating";
import { seedPriceHistory } from "./market";
import seed from "@/data/cards.json";

/** A seed card enriched at load time with computed rating + simulated prices. */
export type MarketCard = Card & { rating: number };

const cards: MarketCard[] = (seed as Card[]).map((card) => {
  const rating = computeRating(card);
  // Legacy stats.rating is overwritten so nothing displays a stale number.
  return {
    ...card,
    rating,
    stats: { ...card.stats, rating },
    priceHistory: seedPriceHistory(card, rating),
  };
});

/** All cards sorted by rating (highest first). Rank = index + 1. */
const ranked = [...cards].sort((a, b) => b.rating - a.rating);
const rankById = new Map(ranked.map((card, i) => [card.id, i + 1]));

export function getAllCards(): MarketCard[] {
  return ranked;
}

export function getCard(id: string): MarketCard | undefined {
  return cards.find((card) => card.id === id);
}

/** 1-based rank across the whole index, derived from rating. */
export function getRank(id: string): number {
  return rankById.get(id) ?? cards.length;
}
