import seed from "@/data/cards.json";
import type {
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
};

function normalize(value: number, max: number, curve: Curve): number {
  if (max <= 0) return 0;
  const n =
    curve === "log" ? Math.log(1 + value) / Math.log(1 + max) : value / max;
  return Math.min(1, n) * 100;
}

const maxes: Record<string, number> = {};
for (const card of seed as Card[]) {
  for (const [key, value] of Object.entries(card.metrics)) {
    const scoped = `${card.type}.${key}`;
    maxes[scoped] = Math.max(maxes[scoped] ?? 0, value);
  }
}

export function computeRating(card: Card): number {
  const config = RATING_CONFIG[card.type] as MetricConfig<string>;
  const metrics = card.metrics as unknown as Record<string, number>;

  let weighted = 0;
  for (const [key, { weight, curve }] of Object.entries(config)) {
    const value = metrics[key as keyof typeof metrics];
    weighted += weight * normalize(value, maxes[`${card.type}.${key}`], curve);
  }

  const { floor, ceil } = RATING_CONFIG;
  const rating = Math.round(floor + ((ceil - floor) * weighted) / 100);
  return Math.max(0, Math.min(99, rating));
}
