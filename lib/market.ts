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

/**
 * ARTIFACT BOOK VALUES — editorial, tiered ₮60–₮350 so every card outprices
 * every single grant (daily visit ₮25, arena loss ₮10) and royalty yields
 * land at a sane 2–7%/day of book. The 2026-08 rebalance scaled each
 * committed price history to these levels; the nightly pipeline walks on
 * from there, so this map only seeds pre-pipeline forks. Tier logic:
 * scarce real assets high, funding lore mid, memes low — The Em Dash stays
 * the floor because it is everywhere.
 */
export const ARTIFACT_BOOK: Record<string, number> = {
  // premium — the assets everyone is actually fighting over
  "the-gpu": 350,
  "the-compute-cluster": 320,
  "the-exit": 300,
  "the-valuation": 280,
  "the-scaling-law": 260,
  // solid — load-bearing industry furniture
  "the-benchmark": 240,
  "the-term-sheet": 220,
  "the-seed-round": 210,
  "the-token": 200,
  "the-context-window": 190,
  "the-jailbreak": 180,
  // mid — the daily grind
  "the-system-prompt": 170,
  "the-eval": 160,
  "the-leaderboard": 155,
  "the-rlhf-thumbs-up": 150,
  "the-latency": 145,
  "the-turing-test": 140,
  "the-whitepaper": 135,
  "the-demo": 130,
  "the-arxiv-timestamp": 125,
  "the-stealth-startup": 120,
  "the-burn-rate": 120,
  // low — beloved but abundant
  "ignore-previous-instructions": 115,
  "the-off-switch": 110,
  "the-temperature-slider": 105,
  "vibe-coding": 100,
  "the-pivot": 95,
  "the-waitlist": 90,
  "the-hallucinated-citation": 90,
  "the-stochastic-parrot": 85,
  "the-wrapper": 80,
  "agi-in-two-weeks": 80,
  "the-down-round": 75,
  // floor — ubiquity is not value
  "as-an-ai": 70,
  "the-alignment-chart": 70,
  "the-paperclip": 65,
  "the-conference-badge": 65,
  "the-em-dash": 60,
};

/** 30 days of prices ending today. Start price = rating × 10. */
export function seedPriceHistory(card: Card, rating: number): PricePoint[] {
  const rand = mulberry32(hashId(card.id));
  // artifacts trade at their editorial book value with a sleepy wobble
  const artifact = card.type === "artifact";
  const drift = artifact ? 0 : ((rating - 75) / 99) * 0.006;
  const vol = artifact ? 0.02 : VOLATILITY[card.rarity];

  const today = Math.floor(Date.now() / DAY_MS) * DAY_MS;
  const points: PricePoint[] = [];
  let price = artifact ? (ARTIFACT_BOOK[card.id] ?? 90) : rating * 10;
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
