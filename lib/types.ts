export type CardType = "company" | "engineer";

export type Rarity = "common" | "rare" | "epic" | "legendary" | "mythic";

/**
 * A single point on a card's price chart. Unused for now — priceHistory is
 * seeded empty — but shaped so the future Football-Index-style mechanic can
 * append to it without a data migration.
 */
export interface PricePoint {
  /** ISO 8601 timestamp */
  timestamp: string;
  price: number;
}

/** Raw company metrics the rating engine normalizes. Valuation/funding in $B. */
export interface CompanyMetrics {
  valuation: number;
  funding: number;
  headcount: number;
  modelCount: number;
}

/** Raw engineer metrics the rating engine normalizes. */
export interface EngineerMetrics {
  citations: number;
  followers: number;
  /** Editorial 0–100 score of field impact. */
  impactScore: number;
  yearsInField: number;
}

export interface CardStats {
  /**
   * Legacy stored rating. At runtime this is overwritten by the computed
   * rating from lib/rating.ts — treat `MarketCard.rating` as the source of truth.
   */
  rating: number;
  /** Research / product innovation, 0–99 */
  innovation: number;
  /** Industry influence and reach, 0–99 */
  influence: number;
  /** Current momentum / hype, 0–99 */
  momentum: number;
}

export interface Card {
  id: string;
  name: string;
  type: CardType;
  /** Short monogram / emblem text — fallback art when `image` is null or fails to load. */
  avatar: string;
  /**
   * Royalty-free card art URL: Wikimedia Commons portrait for engineers,
   * site favicon (Google favicon service) for companies. Null = monogram only.
   */
  image: string | null;
  /** One-line flavor text under the name. */
  tagline: string;
  rarity: Rarity;
  /** Raw metrics feeding the rating engine — shape depends on `type`. */
  metrics: CompanyMetrics | EngineerMetrics;
  stats: CardStats;
  /** Empty until the price mechanic ships. */
  priceHistory: PricePoint[];
}
