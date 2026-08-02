import type { MarketCard } from "./cards";
import type { CommunitySliders } from "./create";
import type { MetaCategory, MetaKey } from "./meta";
import { fnvHash as hash, mulberry32 } from "./rng";

/**
 * Versus-mode axis mapping. Community cards and Series 1 cards live on
 * different scales, so both sides are projected onto the same four axes.
 * Tunable table — each entry documents its reasoning.
 */
const ARTIFACT_CEIL = 0.45;

function artifactAxis(card: MarketCard, key: "vibes" | "ubiquity" | "lore" | "uselessness"): number {
  const m = card.metrics as unknown as Record<string, number>;
  return Math.round((m[key] ?? 0) * ARTIFACT_CEIL);
}

export const VS_MAPPING: Record<
  keyof CommunitySliders,
  (card: MarketCard) => number
> = {
  // momentum is the closest Series 1 analog to "actively shipping"
  shipping: (c) => (c.type === "artifact" ? artifactAxis(c, "vibes") : c.stats.momentum),
  // influence ≈ clout by construction
  yapping: (c) => (c.type === "artifact" ? artifactAxis(c, "ubiquity") : c.stats.influence),
  // innovation ≈ galaxy brain
  galaxyBrain: (c) => (c.type === "artifact" ? artifactAxis(c, "lore") : c.stats.innovation),
  // companies literally hoard GPUs; people get a rating-derived proxy
  gpuHoarding: (c) =>
    c.type === "artifact"
      ? artifactAxis(c, "uselessness")
      : c.type === "company"
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
  /** Fixed per-side values for every meta category (see lib/meta.ts). */
  meta?: Record<MetaKey, number>;
  cardId?: string;
}

export interface VsRound {
  key: string;
  label: string;
  /** The Editor's category definition — flashed once in the round intro. */
  definition?: string;
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

/**
 * Arena resolution: best-of-3 rounds. With `activeMeta` (today's 4 IN THE
 * META categories) and both sides carrying meta values, the 3 round
 * categories are chosen deterministically from the pairing hash out of the
 * active 4 — same two cards, same day, same result; different day, different
 * meta, possibly different result. That's the point. Without meta (legacy),
 * falls back to the fixed 4 axes. `chaos` adds seeded upsets on top.
 */
export function resolveArena(
  a: VsSide,
  b: VsSide,
  chaos = false,
  activeMeta?: MetaCategory[],
): VsResult {
  const pairSeed = hash(`${a.label}|${b.label}`);
  const useMeta = !!(activeMeta && activeMeta.length >= 3 && a.meta && b.meta);
  const axes: { key: string; label: string; definition?: string; av: number; bv: number }[] =
    useMeta
      ? [...activeMeta!]
          .map((cat, i) => ({ cat, sort: hash(`${pairSeed}:meta:${i}`) }))
          .sort((x, y) => x.sort - y.sort)
          .slice(0, 3)
          .map(({ cat }) => ({
            key: cat.key,
            label: cat.name,
            definition: cat.definition,
            av: a.meta![cat.key],
            bv: b.meta![cat.key],
          }))
      : [...AXES]
          .map((axis, i) => ({ axis, sort: hash(`${pairSeed}:${i}`) }))
          .sort((x, y) => x.sort - y.sort)
          .slice(0, 3)
          .map(({ axis }) => ({
            key: axis.key,
            label: axis.label,
            av: a.stats[axis.key],
            bv: b.stats[axis.key],
          }));
  const rand = mulberry32(
    hash(`${a.label}|${b.label}|${new Date().toISOString().slice(0, 10)}`),
  );
  const agiInvolved = a.cardId === "agi" || b.cardId === "agi";
  const rounds: VsRound[] = axes.map(({ key, label, definition, av, bv }) => {
    // AGI is unknowable: every round is a seeded coin flip
    let winner: "a" | "b" | "tie" = agiInvolved
      ? rand() < 0.5 ? "a" : "b"
      : av === bv ? "tie" : av > bv ? "a" : "b";
    let upset = false;
    if (!agiInvolved && chaos && winner !== "tie" && rand() < 0.18) {
      winner = winner === "a" ? "b" : "a";
      upset = true;
    }
    return { key, label, definition, a: av, b: bv, winner, upset };
  });
  const aWins = rounds.filter((r) => r.winner === "a").length;
  const bWins = rounds.filter((r) => r.winner === "b").length;
  const winner =
    aWins !== bWins ? (aWins > bWins ? "a" : "b")
    : a.rating !== b.rating ? (a.rating > b.rating ? "a" : "b")
    : "tie";
  return { rounds, aWins, bWins, winner };
}

/**
 * The decisive category of a result — the winner's biggest-gap round.
 * Used in share text ("Lost on SHITPOSTING, which honestly tracks").
 */
export function decisiveCategory(result: VsResult): string | null {
  if (result.winner === "tie") return null;
  const side = result.winner;
  const won = result.rounds.filter((r) => r.winner === side);
  if (won.length === 0) return null;
  const big = [...won].sort((x, y) => Math.abs(y.a - y.b) - Math.abs(x.a - x.b))[0];
  return big.label;
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
