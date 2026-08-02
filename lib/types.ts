export type CardType = "company" | "engineer" | "moment" | "rivalry";

/** Visual variants (see PackRipper/TradingCard). Absent = standard. */
export type CardVariant = "standard" | "freeAgent" | "hotStreak";

export interface CareerStop {
  org: string;
  role: string;
  years: string;
}

/** One half of a rivalry card's split face. */
export interface RivalrySide {
  name: string;
  avatar: string;
}

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

/** Collectible AI-history events. All 0–100 editorial. */
export interface MomentMetrics {
  impact: number;
  chaos: number;
  memeability: number;
  legacy: number;
}

/** Dual-face feud cards. All 0–100 editorial. */
export interface RivalryMetrics {
  heat: number;
  history: number;
  pettiness: number;
  stakes: number;
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
  /** Zero-padded print number within the edition, e.g. "004". */
  serial: string;
  /** Total prints in this edition (from EDITION_SIZES by rarity). */
  editionSize: number;
  series: number;
  /** Raw metrics feeding the rating engine — shape depends on `type`. */
  metrics: CompanyMetrics | EngineerMetrics | MomentMetrics | RivalryMetrics;
  stats: CardStats;
  /** One MTG-style lore line. Tone: affectionate roast. */
  flavorText: string;
  /** Engineers only: 2–4 career stops, rendered as a timeline. */
  career?: CareerStop[];
  variant?: CardVariant;
  /** Curated cards only — powers the /today daily-card pick. */
  dailyBlurb?: string;
  /** Moments only: display date stamp, e.g. "Nov 2023". */
  momentDate?: string;
  /** Rivalries only: the two half-faces. */
  sides?: [RivalrySide, RivalrySide];
  /** Empty until the price mechanic ships. */
  priceHistory: PricePoint[];
}
