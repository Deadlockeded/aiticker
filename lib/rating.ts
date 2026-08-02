import seed from "@/data/cards.json";
import type {
  ArtifactMetrics,
  Card,
  CompanyMetrics,
  EngineerMetrics,
  MomentMetrics,
  RivalryMetrics,
} from "./types";

/**
 * FIFA-style 0–99 rating computed from raw metrics.
 *
 * Each metric is normalized 0–100 against the max in the seed set ("log"
 * curve compresses huge ranges like valuation, "linear" suits bounded ones),
 * weighted, then mapped onto [floor, ceil] so the weakest card still reads
 * like a playable FIFA card rather than a 12.
 */
type Curve = "linear" | "log";
type MetricConfig<K extends string> = Record<K, { weight: number; curve: Curve }>;

export const RATING_CONFIG: {
  floor: number;
  ceil: number;
  company: MetricConfig<keyof CompanyMetrics>;
  engineer: MetricConfig<keyof EngineerMetrics>;
  moment: MetricConfig<keyof MomentMetrics>;
  rivalry: MetricConfig<keyof RivalryMetrics>;
  artifact: MetricConfig<keyof ArtifactMetrics>;
} = {
  floor: 55,
  ceil: 99,
  company: {
    valuation: { weight: 0.35, curve: "log" },
    funding: { weight: 0.25, curve: "log" },
    headcount: { weight: 0.15, curve: "log" },
    modelCount: { weight: 0.25, curve: "linear" },
  },
  engineer: {
    citations: { weight: 0.35, curve: "log" },
    impactScore: { weight: 0.3, curve: "linear" },
    followers: { weight: 0.2, curve: "log" },
    yearsInField: { weight: 0.15, curve: "linear" },
  },
  moment: {
    impact: { weight: 0.35, curve: "linear" },
    legacy: { weight: 0.3, curve: "linear" },
    memeability: { weight: 0.2, curve: "linear" },
    chaos: { weight: 0.15, curve: "linear" },
  },
  rivalry: {
    heat: { weight: 0.35, curve: "linear" },
    stakes: { weight: 0.3, curve: "linear" },
    history: { weight: 0.2, curve: "linear" },
    pettiness: { weight: 0.15, curve: "linear" },
  },
  artifact: {
    ubiquity: { weight: 0.35, curve: "linear" },
    lore: { weight: 0.3, curve: "linear" },
    vibes: { weight: 0.25, curve: "linear" },
    uselessness: { weight: 0.1, curve: "linear" },
  },
};

/** Artifacts are the basic lands of the set — clamp them to the bottom. */
const ARTIFACT_BAND = { floor: 50, ceil: 66 };

/**
 * Live-signal weights (pipeline data, applied only when a card has the
 * signal). Attention/buzz are meaningful but bounded; stars/downloads are
 * slow-moving foundation stats. Weights renormalize against whatever
 * metrics+signals a card actually has, so signal-less cards are unchanged.
 */
export const SIGNAL_CONFIG: Partial<
  Record<string, { weight: number; curve: Curve | "delta" }>
> = {
  attention7d: { weight: 0.06, curve: "log" },
  attentionDelta: { weight: 0.05, curve: "delta" },
  hnMentions7d: { weight: 0.04, curve: "log" },
  stars: { weight: 0.05, curve: "log" },
  hfDownloads30d: { weight: 0.05, curve: "log" },
  hIndex: { weight: 0.03, curve: "linear" },
};

function normalize(value: number, max: number, curve: Curve): number {
  if (max <= 0) return 0;
  const n =
    curve === "log" ? Math.log(1 + value) / Math.log(1 + max) : value / max;
  return Math.min(1, n) * 100;
}

function computeMaxes(cards: Card[]): Record<string, number> {
  const maxes: Record<string, number> = {};
  for (const card of cards) {
    for (const [key, value] of Object.entries(card.metrics)) {
      const scoped = `${card.type}.${key}`;
      maxes[scoped] = Math.max(maxes[scoped] ?? 0, value);
    }
    for (const [key, value] of Object.entries(card.signals ?? {})) {
      if (typeof value !== "number") continue;
      const scoped = `signal.${key}`;
      maxes[scoped] = Math.max(maxes[scoped] ?? 0, value);
    }
  }
  return maxes;
}

/**
 * Build a rating function whose normalization maxes come from `cards`.
 * The update pipeline uses this with freshly-fetched signals; the frontend
 * default context below uses the committed seed, so both agree.
 */
export function buildRatingContext(cards: Card[]) {
  const maxes = computeMaxes(cards);

  function computeRating(card: Card): number {
    const config = RATING_CONFIG[card.type] as MetricConfig<string>;
    const metrics = card.metrics as unknown as Record<string, number>;

    let weighted = 0;
    let weightSum = 0;
    for (const [key, { weight, curve }] of Object.entries(config)) {
      weighted += weight * normalize(metrics[key], maxes[`${card.type}.${key}`], curve);
      weightSum += weight;
    }
    for (const [key, cfg] of Object.entries(SIGNAL_CONFIG)) {
      const value = card.signals?.[key as keyof typeof card.signals];
      if (typeof value !== "number" || !cfg) continue;
      const n =
        cfg.curve === "delta"
          ? Math.max(0, Math.min(100, 50 + value / 2)) // ±100% -> 0..100
          : normalize(value, maxes[`signal.${key}`], cfg.curve);
      weighted += cfg.weight * n;
      weightSum += cfg.weight;
    }

    const { floor, ceil } =
      card.type === "artifact" ? ARTIFACT_BAND : RATING_CONFIG;
    const rating = Math.round(floor + ((ceil - floor) * (weighted / weightSum)) / 100);
    return Math.max(0, Math.min(99, rating));
  }

  return { computeRating };
}

const defaultContext = buildRatingContext(seed as Card[]);

export function computeRating(card: Card): number {
  return defaultContext.computeRating(card);
}
