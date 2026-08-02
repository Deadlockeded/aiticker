import type { CommunitySliders } from "./create";
import { SHIPMETER_LINES, type ShipMeterCtx } from "./lines";

/**
 * Cofounder compatibility. Deterministic and order-independent: the pair is
 * canonicalized by handle before scoring, so a×b === b×a, and the same pair
 * always gets the same number. Complementary stats score high; identical
 * extremes score chaotic; a hash wobble makes every pair feel bespoke.
 */

const hi = (v: number) => v >= 65;
const lo = (v: number) => v <= 45;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

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
