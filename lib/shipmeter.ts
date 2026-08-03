import type { CommunitySliders } from "./create";
import {
  equitySplit,
  SHIP_CATEGORIES,
  shipTier,
  SHIPMETER_LINES,
  type ShipCategoryKey,
  type ShipMeterCtx,
} from "./lines";
import type { RawFootprint } from "./score";
import { fnvHash as hash } from "./rng";

/**
 * Cofounder compatibility. Deterministic and order-independent: the pair is
 * canonicalized by handle before scoring, so a×b === b×a, and the same pair
 * always gets the same number. Complementary stats score high; identical
 * extremes score chaotic; a hash wobble makes every pair feel bespoke.
 */

const hi = (v: number) => v >= 65;
const lo = (v: number) => v <= 45;

export function compatibility(
  aHandle: string,
  aStats: CommunitySliders,
  bHandle: string,
  bStats: CommunitySliders,
): number {
  // canonical order → order independence
  const flip = aHandle.toLowerCase() > bHandle.toLowerCase();
  const [h1, s1] = flip ? [bHandle, bStats] : [aHandle, aStats];
  const [h2, s2] = flip ? [aHandle, aStats] : [bHandle, bStats];

  let score = 45;
  // shipping: one builder is required; two is fine; zero is a book club
  if ((hi(s1.shipping) && lo(s2.shipping)) || (lo(s1.shipping) && hi(s2.shipping))) score += 14;
  else if (hi(s1.shipping) && hi(s2.shipping)) score += 8;
  else if (lo(s1.shipping) && lo(s2.shipping)) score -= 12;
  // clout: one megaphone great, two megaphones deafening
  if ((hi(s1.yapping) && lo(s2.yapping)) || (lo(s1.yapping) && hi(s2.yapping))) score += 12;
  else if (hi(s1.yapping) && hi(s2.yapping)) score -= 14;
  // galaxy brain: some is good, double is a whiteboard cult (small bonus anyway)
  if (hi(s1.galaxyBrain) !== hi(s2.galaxyBrain)) score += 6;
  else if (hi(s1.galaxyBrain) && hi(s2.galaxyBrain)) score += 3;
  // gpu hoarding: someone must hold the compute; shared poverty is bonding
  if (hi(s1.gpuHoarding) !== hi(s2.gpuHoarding)) score += 6;
  else if (lo(s1.gpuHoarding) && lo(s2.gpuHoarding)) score += 4;

  const wobble = (hash(`${h1.toLowerCase()}|${h2.toLowerCase()}`) % 21) - 10;
  return Math.max(3, Math.min(99, Math.round(score + wobble)));
}

export function shipVerdict(ctx: ShipMeterCtx): string {
  return SHIPMETER_LINES.find((l) => l.when(ctx))!.line(ctx);
}

export function shipIcon(pct: number): string {
  if (pct >= 70) return "❤️‍🔥";
  if (pct >= 45) return "💛";
  return "💔";
}


// ---------------------------------------------------------------- v2

export interface ShipSide {
  handle: string;
  stats: CommunitySliders;
  raw: RawFootprint;
}

export interface ShipBar {
  key: ShipCategoryKey;
  name: string;
  /** 0–100. Honest computation; only the wording is a joke. */
  score: number;
  line: string;
}

const clamp = (v: number) => Math.max(4, Math.min(99, Math.round(v)));

/** Closeness of two numbers on a 0–100 scale, as a 0–100 similarity. */
const closeness = (a: number, b: number, scale = 100) =>
  100 - Math.min(100, (Math.abs(a - b) / scale) * 100);

/**
 * The four bars. Each derives from REAL signal — commit recency and activity,
 * language breadth, repo hygiene, shipping pace — and only the label and line
 * are comedic. The line is picked by band, so the number and the joke can
 * never disagree.
 */
export function shipBars(a: ShipSide, b: ShipSide): ShipBar[] {
  const bars: { key: ShipCategoryKey; score: number }[] = [
    {
      // "timezone chemistry": how similarly recently they both pushed —
      // the closest public proxy for overlapping working hours
      key: "timezone",
      score: clamp(closeness(
        Math.min(a.raw.daysSinceLastPush, 120),
        Math.min(b.raw.daysSinceLastPush, 120),
        120,
      )),
    },
    {
      // "stack alignment": similarity of language breadth
      key: "stack",
      score: clamp(closeness(Math.min(a.raw.languages, 12), Math.min(b.raw.languages, 12), 12)),
    },
    {
      // "naming philosophy": repo-count and fork-ratio hygiene, compared
      key: "naming",
      score: clamp(
        0.6 * closeness(a.raw.forkRatio * 100, b.raw.forkRatio * 100) +
          0.4 * closeness(Math.min(a.raw.publicRepos, 80), Math.min(b.raw.publicRepos, 80), 80),
      ),
    },
    {
      // "shipping cadence": 90-day push volume, compared
      key: "cadence",
      score: clamp(closeness(Math.min(a.raw.pushes90d, 90), Math.min(b.raw.pushes90d, 90), 90)),
    },
  ];
  return bars.map(({ key, score }) => {
    const cat = SHIP_CATEGORIES[key];
    const band = Math.min(cat.lines.length - 1, Math.floor((score / 100) * cat.lines.length));
    return { key, name: cat.name, score, line: cat.lines[band] };
  });
}

/** Tier title + one line, both deterministic for the pair. */
export function shipReading(pct: number, aHandle: string, bHandle: string) {
  const tier = shipTier(pct);
  const seed = hash(`ship:${[aHandle, bHandle].map((h) => h.toLowerCase()).sort().join("|")}`);
  return {
    title: tier.title,
    line: tier.lines[seed % tier.lines.length],
    equity: equitySplit(seed >>> 3),
  };
}
