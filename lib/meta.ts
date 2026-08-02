import type { MarketCard } from "./cards";
import type { CommunitySliders } from "./create";
import type { ArtifactMetrics, EngineerMetrics } from "./types";
import { dayHash, utcDayKey } from "./daily";

/**
 * THE DAILY META — the rotating pool of fight categories.
 *
 * Every card type maps onto every category from its existing real stats,
 * plus a stable per-card seed wobble (hash of card id + category, ±8) so a
 * card's value in a category is FIXED — never random per fight. Four
 * categories are "in the meta" each UTC day (date-hash, same for everyone);
 * fight rounds draw their 3 categories from the active 4.
 *
 * Tone guardrail: names/definitions are about public internet persona only —
 * same rules as quips. "Shitposting" is the ceiling for edginess.
 */

export type MetaKey =
  | "shitposting"
  | "drama"
  | "aura"
  | "lore"
  | "shipping"
  | "galaxyBrain"
  | "hype"
  | "mystique"
  | "grindset"
  | "mainCharacter";

export interface MetaCategory {
  key: MetaKey;
  name: string;
  /** The Editor's one-line definition. */
  definition: string;
}

export const META_CATEGORIES: MetaCategory[] = [
  { key: "shitposting", name: "Shitposting", definition: "The art of saying it anyway." },
  { key: "drama", name: "Drama", definition: "Finds the storyline. Or is the storyline." },
  { key: "aura", name: "Aura", definition: "Unmeasurable. We measured it." },
  { key: "lore", name: "Lore", definition: "Years of backstory, weaponized." },
  { key: "shipping", name: "Shipping", definition: "Actually builds the thing." },
  { key: "galaxyBrain", name: "Galaxy Brain", definition: "Thinks in dimensions we bill for." },
  { key: "hype", name: "Hype", definition: "Currently everywhere." },
  { key: "mystique", name: "Mystique", definition: "Says nothing. Moves markets." },
  { key: "grindset", name: "Grindset", definition: "The streak is the personality." },
  { key: "mainCharacter", name: "Main Character Energy", definition: "It's their timeline. We're posting in it." },
];

/** Stable per-card seed wobble, ±8. Same card + category → same wobble, forever. */
function wobble(id: string, key: MetaKey): number {
  return (dayHash(`meta:${key}:${id}`) % 17) - 8;
}

const clamp = (v: number): number => Math.max(5, Math.min(99, Math.round(v)));
const log10 = (v: number): number => Math.log10(Math.max(1, v + 1));

/**
 * Artifacts: comedic values derived from their silly stats, with a few
 * hand-tuned canon numbers on top (The Em Dash SHITPOSTS at exactly 71 —
 * this is documented fact, do not email us).
 */
const ARTIFACT_OVERRIDES: Partial<Record<string, Partial<Record<MetaKey, number>>>> = {
  "the-em-dash": { shitposting: 71 },
  "ignore-previous-instructions": { drama: 88, mystique: 9 },
  "the-hallucinated-citation": { galaxyBrain: 12, lore: 84 },
  "agi-in-two-weeks": { hype: 97, shipping: 6 },
  "the-gpu": { aura: 90, grindset: 99 },
  "vibe-coding": { grindset: 8, shipping: 66 },
  "the-stochastic-parrot": { shitposting: 79 },
  "the-waitlist": { mystique: 92, shipping: 5 },
};

/** Artifact formulas — silly stats in, silly numbers out. Documented per category. */
function artifactMeta(card: MarketCard, key: MetaKey): number {
  const fixed = ARTIFACT_OVERRIDES[card.id]?.[key];
  if (fixed !== undefined) return fixed;
  const m = card.metrics as ArtifactMetrics;
  const w = wobble(card.id, key);
  switch (key) {
    case "shitposting": return clamp(0.45 * m.ubiquity + 0.35 * m.vibes + w); // omnipresent + funny = posts
    case "drama":       return clamp(0.35 * m.uselessness + 0.3 * m.vibes + w); // useless things cause discourse
    case "aura":        return clamp(0.55 * m.vibes + 0.25 * m.lore + w);
    case "lore":        return clamp(0.85 * m.lore + w);
    case "shipping":    return clamp(55 - 0.4 * m.uselessness + w); // useless things do not ship
    case "galaxyBrain": return clamp(0.4 * m.lore + 0.3 * m.uselessness + w); // deep, in the wrong direction
    case "hype":        return clamp(0.55 * m.ubiquity + 0.25 * m.vibes + w);
    case "mystique":    return clamp(0.5 * m.lore + 0.3 * m.uselessness + w);
    case "grindset":    return clamp(0.5 * m.ubiquity + 0.15 * m.vibes + w); // being everywhere IS the grind
    case "mainCharacter": return clamp(0.5 * m.vibes + 0.3 * m.ubiquity + w);
  }
}

/**
 * Index cards (companies + engineers) — formulas over the real stat block
 * (innovation / influence / momentum, 0–99), rating, live signals, and
 * career depth. Each line documents its reasoning.
 */
function indexMeta(card: MarketCard, key: MetaKey): number {
  const s = card.stats;
  const sig = card.signals ?? {};
  const delta = sig.attentionDelta ?? 0; // % attention change vs prior week
  const hn = sig.hnMentions7d ?? 0;
  const cites = sig.citations ?? (card.type === "engineer" ? (card.metrics as EngineerMetrics).citations : 0);
  const stars = sig.stars ?? 0;
  const years = card.type === "engineer" ? (card.metrics as EngineerMetrics).yearsInField : 0;
  const w = wobble(card.id, key);
  switch (key) {
    // buzz-weighted: momentum + reach + a live HN kicker
    case "shitposting": return clamp(0.55 * s.momentum + 0.3 * s.influence + Math.min(14, hn * 2) + w);
    // momentum volatility + news attention (|Δ| counts both directions — drama is drama)
    case "drama":       return clamp(0.45 * s.momentum + 0.25 * s.influence + Math.min(30, Math.abs(delta)) + w);
    // mystique/clout blend: pure standing
    case "aura":        return clamp(0.55 * s.influence + 0.35 * card.rating + w);
    // history depth: engineers earn it by the year, companies by institutional weight
    case "lore":        return clamp(card.type === "engineer" ? 2.5 * years + 0.35 * s.influence + w : 0.5 * s.influence + 0.35 * card.rating + w);
    // output stats, straight up
    case "shipping":    return clamp(0.7 * s.momentum + 0.25 * s.innovation + w);
    // research depth + a citation log bonus
    case "galaxyBrain": return clamp(0.7 * s.innovation + Math.min(20, 5 * log10(cites)) + w);
    // attention delta weighted — this one MOVES day to day, that's the point
    case "hype":        return clamp(0.5 * s.momentum + 0.25 * s.influence + Math.max(-25, Math.min(25, delta)) + w);
    // inverse of public output vs influence: high standing, low noise
    case "mystique":    return clamp(0.8 * s.influence - 0.35 * s.momentum + 25 + w);
    // cadence/consistency: momentum + a GitHub-stars log kicker
    case "grindset":    return clamp(0.55 * s.momentum + 0.25 * s.innovation + Math.min(15, 4 * log10(stars)) + w);
    // composite of clout + drama + seed
    case "mainCharacter": return clamp(0.45 * s.influence + 0.35 * s.momentum + Math.min(12, Math.abs(delta) / 2) + w);
  }
}

/** One card, one category, one fixed number. AGI stays unknowable-mid. */
export function metaValueForCard(card: MarketCard, key: MetaKey): number {
  if (card.id === "agi") return clamp(50 + wobble(card.id, key)); // display only; its rounds coin-flip anyway
  if (card.type === "artifact") return artifactMeta(card, key);
  return indexMeta(card, key);
}

export function cardMetaValues(card: MarketCard): Record<MetaKey, number> {
  return Object.fromEntries(
    META_CATEGORIES.map((c) => [c.key, metaValueForCard(card, c.key)]),
  ) as Record<MetaKey, number>;
}

/**
 * Prospects (scored GitHub profiles) — mapped from their scout stats
 * (shipping / yapping / galaxyBrain / gpuHoarding) + overall rating.
 */
export function profileMetaValues(
  handle: string,
  stats: CommunitySliders,
  rating: number,
): Record<MetaKey, number> {
  const id = `@${handle.replace(/^@/, "")}`;
  const v = (key: MetaKey, raw: number) => clamp(raw + wobble(id, key));
  return {
    shitposting: v("shitposting", 0.8 * stats.yapping),
    drama: v("drama", 0.55 * stats.yapping + 0.2 * stats.gpuHoarding),
    aura: v("aura", 0.4 * stats.yapping + 0.4 * stats.galaxyBrain),
    lore: v("lore", 0.7 * rating),
    shipping: v("shipping", 0.95 * stats.shipping),
    galaxyBrain: v("galaxyBrain", 0.95 * stats.galaxyBrain),
    hype: v("hype", 0.55 * stats.yapping + 0.3 * stats.shipping),
    mystique: v("mystique", 0.5 * stats.galaxyBrain - 0.25 * stats.yapping + 30),
    grindset: v("grindset", 0.75 * stats.shipping + 0.15 * stats.gpuHoarding),
    mainCharacter: v("mainCharacter", 0.55 * stats.yapping + 0.3 * stats.shipping),
  };
}

// ---- daily rotation --------------------------------------------------------

// Cached per dateKey so getDailyMeta is a stable useSyncExternalStore snapshot.
let cachedKey: string | null = null;
let cachedMeta: MetaCategory[] = [];

/** The 4 categories IN THE META today — UTC date-hash, same for everyone. */
export function getDailyMeta(dateKey = utcDayKey()): MetaCategory[] {
  if (dateKey !== cachedKey) {
    cachedKey = dateKey;
    cachedMeta = [...META_CATEGORIES]
      .map((cat) => ({ cat, sort: dayHash(`meta-day:${dateKey}:${cat.key}`) }))
      .sort((a, b) => a.sort - b.sort)
      .slice(0, 4)
      .map((x) => x.cat);
  }
  return cachedMeta;
}

/** META WATCH templates — persona-only, never personal. */
const WATCH_LINES: Record<MetaKey, (name: string) => string> = {
  shitposting: (n) => `Shitposting is in the meta. ${n} was built for this.`,
  drama: (n) => `Drama is in the meta. ${n} found the storyline first.`,
  aura: (n) => `Aura is in the meta. ${n} is unbearable today.`,
  lore: (n) => `Lore is in the meta. ${n} remembers when this was all fields.`,
  shipping: (n) => `Shipping is in the meta. ${n} actually builds the thing.`,
  galaxyBrain: (n) => `Galaxy Brain is in the meta. ${n} is thinking in billable dimensions.`,
  hype: (n) => `Hype is in the meta. ${n} is currently everywhere.`,
  mystique: (n) => `Mystique is in the meta. ${n} said nothing and gained ten points.`,
  grindset: (n) => `Grindset is in the meta. ${n} has not logged off.`,
  mainCharacter: (n) => `Main Character Energy is in the meta. It's ${n}'s timeline today.`,
};

// Same caching rule as getDailyMeta — string is primitive but keep it cheap.
let cachedWatchKey: string | null = null;
let cachedWatch = "";

/** One-liner for the HOT LIST: today's loudest category + its best card. */
export function metaWatchLine(cards: MarketCard[], dateKey = utcDayKey()): string {
  if (dateKey !== cachedWatchKey) {
    cachedWatchKey = dateKey;
    const active = getDailyMeta(dateKey);
    const cat = active[dayHash(`meta-watch:${dateKey}`) % active.length];
    const pool = cards.filter((c) => c.type !== "artifact" && c.id !== "agi");
    const top = [...pool].sort(
      (a, b) => metaValueForCard(b, cat.key) - metaValueForCard(a, cat.key),
    )[0];
    cachedWatch = top ? WATCH_LINES[cat.key](top.name) : "";
  }
  return cachedWatch;
}
