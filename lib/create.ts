import type { Rarity } from "./types";
import type { MarketCard } from "./cards";
import { notifyStore } from "./binder";
import { KEYS, readRaw, removeRaw, writeRaw } from "./storage";

/**
 * Make-your-own-card. Everything client-side: the photo is a data URL that
 * never leaves the device, the "Algorithm" verdict is a deterministic hash
 * of the name (same name -> same rating, feels like a real judgement), and
 * the rarity roll is scarce (3 re-rolls/day) so legendaries mean something.
 */

export const COMMUNITY_STATS = [
  { key: "shipping", label: "Shipping" },
  { key: "yapping", label: "Clout" }, // key predates the label — stored cards keep it
  { key: "galaxyBrain", label: "Galaxy brain" },
  { key: "gpuHoarding", label: "GPU hoarding" },
] as const;

export type CommunityStatKey = (typeof COMMUNITY_STATS)[number]["key"];
export type CommunitySliders = Record<CommunityStatKey, number>;

export interface CommunityCard {
  name: string;
  title: string;
  /** Manual mode: downscaled data URL (local only). Scored mode: GitHub avatar URL. */
  photo: string | null;
  sliders: CommunitySliders;
  rating: number;
  rarity: Rarity;
  createdAt: string;
  /** true = stats derived from public footprint; false/absent = manual sliders. */
  scored?: boolean;
  /** GitHub handle (scored mode). */
  handle?: string;
  /** The Algorithm's Verdict (scored mode) — printed on the card. */
  verdict?: string;
  /** Absurd certification stamp (see lib/lines.ts STAMPS). */
  stamp?: string;
}

function nameHash(name: string): number {
  let h = 2166136261;
  const norm = name.trim().toLowerCase();
  for (let i = 0; i < norm.length; i++) {
    h = Math.imul(h ^ norm.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

const SLIDER_WEIGHTS: Record<CommunityStatKey, number> = {
  shipping: 0.3,
  galaxyBrain: 0.3,
  yapping: 0.2,
  gpuHoarding: 0.2,
};

/** The Algorithm. Weighted sliders + a deterministic name bonus, 40–99. */
export function computeCommunityRating(
  name: string,
  sliders: CommunitySliders,
): number {
  const weighted = COMMUNITY_STATS.reduce(
    (sum, s) => sum + sliders[s.key] * SLIDER_WEIGHTS[s.key],
    0,
  );
  const bonus = nameHash(name) % 9; // 0–8, the Algorithm's opinion of you
  return Math.max(40, Math.min(99, Math.round(40 + weighted * 0.52 + bonus)));
}

export const COMMUNITY_RARITY_ODDS: [Rarity, number][] = [
  ["common", 0.55],
  ["rare", 0.3],
  ["epic", 0.12],
  ["legendary", 0.03],
];

/** The best rarity a rating can print at — a 67 must never come out Epic. */
export function rarityCapFor(rating: number): Rarity {
  if (rating >= 90) return "legendary";
  if (rating >= 80) return "epic";
  if (rating >= 70) return "rare";
  return "common";
}

const RARITY_LADDER: Rarity[] = ["common", "rare", "epic", "legendary"];

export function rollCommunityRarity(rating: number): Rarity {
  const roll = Math.random();
  let cumulative = 0;
  let rolled: Rarity = "common";
  for (const [rarity, odds] of COMMUNITY_RARITY_ODDS) {
    cumulative += odds;
    if (roll < cumulative) {
      rolled = rarity;
      break;
    }
  }
  // luck can only downgrade from the rating's tier, never inflate past it
  const cap = rarityCapFor(rating);
  return RARITY_LADDER.indexOf(rolled) > RARITY_LADDER.indexOf(cap) ? cap : rolled;
}

export const RARITY_EMOJI: Record<Rarity, string> = {
  common: "⬜",
  rare: "🟦",
  epic: "🟪",
  legendary: "🟨",
  mythic: "🌈",
};

// ---- re-roll allowance (3/day) ----

export const REROLLS_PER_DAY = 3;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getRerollsLeft(): number {
  try {
    const raw = JSON.parse(readRaw(KEYS.reroll) ?? "null") as {
      date: string;
      used: number;
    } | null;
    if (raw && raw.date === todayKey()) {
      return Math.max(0, REROLLS_PER_DAY - raw.used);
    }
  } catch {
    // fresh allowance
  }
  return REROLLS_PER_DAY;
}

export function consumeReroll(): number {
  const left = getRerollsLeft();
  if (left <= 0) return 0;
  writeRaw(
    KEYS.reroll,
    JSON.stringify({ date: todayKey(), used: REROLLS_PER_DAY - left + 1 }),
  );
  notifyStore();
  return left - 1;
}

// ---- saved card ----

export function getSavedCommunityCardSnapshot(): string {
  return readRaw(KEYS.communityCard) ?? "null";
}

export function parseCommunityCard(raw: string): CommunityCard | null {
  try {
    return JSON.parse(raw) as CommunityCard | null;
  } catch {
    return null;
  }
}

export function saveCommunityCard(card: CommunityCard): void {
  writeRaw(KEYS.communityCard, JSON.stringify(card));
  notifyStore();
}

export function clearCommunityCard(): void {
  removeRaw(KEYS.communityCard);
  notifyStore();
}

export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "??";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** Fabricate a MarketCard so the real TradingCard component renders it. */
export function toMarketCard(card: CommunityCard): MarketCard {
  const price = card.rating * 10;
  return {
    id: "community-you",
    name: card.name,
    type: "engineer",
    avatar: initialsOf(card.name),
    image: card.photo,
    tagline: card.handle
      ? `@${card.handle}${card.title ? ` · ${card.title}` : ""}`
      : card.title || "Community collector",
    rarity: card.rarity,
    serial: "???",
    editionSize: 0,
    series: 0,
    metrics: { citations: 0, followers: 0, impactScore: 0, yearsInField: 0 },
    stats: {
      rating: card.rating,
      innovation: card.sliders.shipping,
      influence: card.sliders.yapping,
      momentum: card.sliders.galaxyBrain,
    },
    priceHistory: [
      { timestamp: "", price },
      { timestamp: "", price },
    ],
    flavorText: card.verdict ?? "Certified by The Algorithm. Results final.",
    rating: card.rating,
  };
}

export function shareText(card: CommunityCard): string {
  const verdict = card.verdict ? ` Verdict: “${card.verdict}”` : "";
  return `The Algorithm rated me ${card.rating}. ${RARITY_EMOJI[card.rarity]} ${card.rarity.toUpperCase()} tier.${verdict} Make yours → aiticker.xyz/create`;
}
