import type { Card, PricePoint, Rarity } from "./types";
import { fnvHash, mulberry32 } from "./rng";

/**
 * Deterministic simulated market. Prices come only from a PRNG seeded by the
 * card id, so server and client always generate identical numbers — no
 * hydration mismatches. Timestamps are anchored to the current UTC day but
 * are never server-rendered (tooltips only), so day rollover is harmless.
 */

export const MARKET_DAYS = 30;

/** Daily volatility per rarity — scarcer cards trade calmer. */
const VOLATILITY: Record<Rarity, number> = {
  common: 0.055,
  rare: 0.042,
  epic: 0.032,
  legendary: 0.024,
  mythic: 0.017,
};

const hashId = fnvHash;

const DAY_MS = 86_400_000;

/** 30 days of prices ending today. Start price = rating × 10. */
export function seedPriceHistory(card: Card, rating: number): PricePoint[] {
  const rand = mulberry32(hashId(card.id));
  // artifacts are penny stocks: flat ~₮12 with a dead-looking wobble
  const artifact = card.type === "artifact";
  const drift = artifact ? 0 : ((rating - 75) / 99) * 0.006;
  const vol = artifact ? 0.02 : VOLATILITY[card.rarity];

  const today = Math.floor(Date.now() / DAY_MS) * DAY_MS;
  const points: PricePoint[] = [];
  let price = artifact ? 12 : rating * 10;
  for (let i = 0; i < MARKET_DAYS; i++) {
    price *= 1 + drift + (rand() - 0.5) * 2 * vol;
    points.push({
      timestamp: new Date(today - (MARKET_DAYS - 1 - i) * DAY_MS).toISOString(),
      price: Math.round(price * 100) / 100,
    });
  }
  return points;
}

type Priced = Card & { priceHistory: PricePoint[] };

export function getCurrentPrice(card: Priced): number {
  return card.priceHistory[card.priceHistory.length - 1].price;
}

/** % change over the trailing `days` (default 24h). */
export function getChange(card: Priced, days = 1): number {
  const h = card.priceHistory;
  const prev = h[Math.max(0, h.length - 1 - days)].price;
  return ((h[h.length - 1].price - prev) / prev) * 100;
}

export function getDailyMove(card: Priced): number {
  return getChange(card, 1);
}

export function getMovers<T extends Priced>(
  cards: T[],
): { gainers: T[]; losers: T[] } {
  const byMove = [...cards].sort((a, b) => getDailyMove(b) - getDailyMove(a));
  return { gainers: byMove.slice(0, 5), losers: byMove.slice(-5).reverse() };
}

/** Play-money formatting: ₮ "Ticks". */
export function formatTicks(value: number, decimals = 0): string {
  return `₮${value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function formatMove(pct: number): string {
  return `${pct >= 0 ? "▲" : "▼"} ${Math.abs(pct).toFixed(1)}%`;
}
