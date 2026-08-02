import type { MarketCard } from "./cards";
import type { CommunitySliders } from "./create";

/**
 * Versus-mode axis mapping. Community cards and Series 1 cards live on
 * different scales, so both sides are projected onto the same four axes.
 * Tunable table — each entry documents its reasoning.
 */
export const VS_MAPPING: Record<
  keyof CommunitySliders,
  (card: MarketCard) => number
> = {
  // momentum is the closest Series 1 analog to "actively shipping"
  shipping: (c) => c.stats.momentum,
  // influence ≈ clout by construction
  yapping: (c) => c.stats.influence,
  // innovation ≈ galaxy brain
  galaxyBrain: (c) => c.stats.innovation,
  // companies literally hoard GPUs; people get a rating-derived proxy
  gpuHoarding: (c) =>
    c.type === "company"
      ? Math.min(99, c.rating + 4)
      : Math.max(25, c.rating - 10),
};

export function cardVsStats(card: MarketCard): CommunitySliders {
  return {
    shipping: VS_MAPPING.shipping(card),
    yapping: VS_MAPPING.yapping(card),
    galaxyBrain: VS_MAPPING.galaxyBrain(card),
    gpuHoarding: VS_MAPPING.gpuHoarding(card),
  };
}

/** One side of a matchup, normalized for display + resolution. */
export interface VsSide {
  kind: "profile" | "card";
  /** "@handle" or the card name. */
  label: string;
  avatar: string | null;
  company: boolean;
  rating: number;
  stats: CommunitySliders;
  cardId?: string;
}

export interface VsRound {
  key: keyof CommunitySliders;
  label: string;
  a: number;
  b: number;
  winner: "a" | "b" | "tie";
  upset: boolean;
}

export interface VsResult {
  rounds: VsRound[];
  aWins: number;
  bWins: number;
  winner: "a" | "b" | "tie";
}

const AXES: { key: keyof CommunitySliders; label: string }[] = [
  { key: "shipping", label: "Shipping" },
  { key: "yapping", label: "Clout" },
  { key: "galaxyBrain", label: "Galaxy brain" },
  { key: "gpuHoarding", label: "GPU hoarding" },
];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Best of 4 stats, total-rating tiebreak. Direct comparisons are fully
 * deterministic (argue-about-able). `chaos` (Quick Match only) adds a
 * seeded upset roll per round — seeded by both labels, so even chaos is
 * reproducible for the same pairing on the same day.
 */
export function resolveVs(a: VsSide, b: VsSide, chaos = false): VsResult {
  const rand = mulberry32(hash(`${a.label}|${b.label}|${new Date().toISOString().slice(0, 10)}`));
  const rounds: VsRound[] = AXES.map(({ key, label }) => {
    const av = a.stats[key];
    const bv = b.stats[key];
    let winner: "a" | "b" | "tie" = av === bv ? "tie" : av > bv ? "a" : "b";
    let upset = false;
    if (chaos && winner !== "tie" && rand() < 0.15) {
      winner = winner === "a" ? "b" : "a";
      upset = true;
    }
    return { key, label, a: av, b: bv, winner, upset };
  });
  const aWins = rounds.filter((r) => r.winner === "a").length;
  const bWins = rounds.filter((r) => r.winner === "b").length;
  const winner =
    aWins !== bWins ? (aWins > bWins ? "a" : "b")
    : a.rating !== b.rating ? (a.rating > b.rating ? "a" : "b")
    : "tie";
  return { rounds, aWins, bWins, winner };
}

/** One-line auto-commentary from the stat gaps. */
export function commentary(result: VsResult, winnerLabel: string): string {
  const side: "a" | "b" = result.winner === "a" ? "a" : "b";
  const won = result.rounds.filter((r) => r.winner === side);
  if (won.length === 0) return "Decided on total rating. A photo finish.";
  const byGap = [...won].sort((x, y) => Math.abs(y.a - y.b) - Math.abs(x.a - x.b));
  const big = byGap[0];
  const gap = Math.abs(big.a - big.b);
  const parts = [`${gap >= 25 ? "demolished" : "won"} on ${big.label}`];
  if (byGap[1]) parts.push(`edged ${byGap[1].label}`);
  return `${winnerLabel} ${parts.join(", ")}.`;
}
