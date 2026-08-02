import type { CommunitySliders } from "./create";

/**
 * ALL joke copy lives here, organized by feature. Logic stays elsewhere —
 * rewrite lines freely without touching code. Conventions:
 * - `when` decides eligibility from real data; order = specificity
 *   (first/earlier matches beat later ones where the picker cares).
 * - Slots use plain template functions so numbers from real data land in
 *   the joke.
 * - Tone guardrail: roast patterns, never persons. No skill/intelligence/
 *   employability jokes. Affectionate dunks only.
 */

// ---------------------------------------------------------------- Ship Meter

export interface ShipMeterCtx {
  pct: number;
  a: { handle: string; stats: CommunitySliders };
  b: { handle: string; stats: CommunitySliders };
}

const hi = (v: number) => v >= 65;
const lo = (v: number) => v <= 45;

export const SHIPMETER_LINES: { when: (c: ShipMeterCtx) => boolean; line: (c: ShipMeterCtx) => string }[] = [
  { when: (c) => hi(c.a.stats.shipping) && lo(c.a.stats.yapping) && hi(c.b.stats.yapping) && lo(c.b.stats.shipping), line: () => "One ships, one tweets. That's a whole company." },
  { when: (c) => hi(c.b.stats.shipping) && lo(c.b.stats.yapping) && hi(c.a.stats.yapping) && lo(c.a.stats.shipping), line: () => "One ships, one tweets. That's a whole company." },
  { when: (c) => hi(c.a.stats.yapping) && hi(c.b.stats.yapping) && lo(c.a.stats.shipping) && lo(c.b.stats.shipping), line: () => "Two visionaries. Nobody drives. The demo is a Figma." },
  { when: (c) => hi(c.a.stats.shipping) && hi(c.b.stats.shipping) && lo(c.a.stats.yapping) && lo(c.b.stats.yapping), line: () => "Two shippers, zero marketing. The product is great and nobody will ever know." },
  { when: (c) => hi(c.a.stats.galaxyBrain) && hi(c.b.stats.galaxyBrain), line: () => "Combined galaxy brain exceeds safe limits. Whiteboard budget: infinite." },
  { when: (c) => hi(c.a.stats.gpuHoarding) && hi(c.b.stats.gpuHoarding), line: () => "Two GPU hoarders. The burn rate will be biblical, the demos incredible." },
  { when: (c) => lo(c.a.stats.gpuHoarding) && lo(c.b.stats.gpuHoarding), line: () => "GPU poor, together. Honestly? Romantic." },
  { when: (c) => c.pct >= 85, line: () => "Incorporate immediately. This is the one." },
  { when: (c) => c.pct >= 70, line: () => "Complementary flaws. That's rarer than product-market fit." },
  { when: (c) => c.pct >= 55, line: () => "It could work. Somebody has to own the deploy key though." },
  { when: (c) => c.pct >= 40, line: () => "Workable, if you never share a codebase. Or a kitchen." },
  { when: (c) => c.pct >= 25, line: () => "The equity split negotiation alone would end this." },
  { when: (c) => c.pct >= 10, line: () => "Cofounder therapy exists. You'd need the group rate." },
  { when: () => true, line: () => "The Algorithm suggests remaining mutuals. Distant mutuals." },
];

// ---------------------------------------------------------------- Roast

export interface RoastFacts {
  handle: string;
  repoCount: number;
  testRepoCount: number;
  portfolioCount: number;
  forkRatio: number;
  totalStars: number;
  maxStars: number;
  daysSinceLastPush: number;
  abandonedRepos: number;
  topLanguage: string | null;
  topLanguageShare: number;
  emptyDescriptions: number;
  bioCliches: string[];
  accountYears: number;
}

export const ROAST_LINES: { when: (f: RoastFacts) => boolean; line: (f: RoastFacts) => string }[] = [
  // specific → generic; picker takes the first 3 matches
  { when: (f) => f.testRepoCount >= 3, line: (f) => `${f.testRepoCount} repos named some variant of "test". Bold archival strategy.` },
  { when: (f) => f.portfolioCount >= 2, line: (f) => `${f.portfolioCount} portfolio sites. The portfolio is the product now.` },
  { when: (f) => f.bioCliches.includes("stealth"), line: () => `Bio says "stealth". The 47 public repos disagree.` },
  { when: (f) => f.bioCliches.includes("visionary"), line: () => `Self-described visionary. The commits describe something else.` },
  { when: (f) => f.bioCliches.includes("building"), line: () => `Bio says "building". Building what? When? The people deserve answers.` },
  { when: (f) => f.forkRatio > 0.7, line: (f) => `${Math.round(f.forkRatio * 100)}% forks. A museum curator with commit access.` },
  { when: (f) => f.abandonedRepos >= 10, line: (f) => `${f.abandonedRepos} repos untouched for a year+. A graveyard with a README policy.` },
  { when: (f) => f.daysSinceLastPush > 365, line: () => `Last push: over a year ago. The repos have filed a missing person report.` },
  { when: (f) => f.daysSinceLastPush > 90 && f.daysSinceLastPush <= 365, line: (f) => `${Math.round(f.daysSinceLastPush)} days since the last push. The streak is dead, long live the streak.` },
  { when: (f) => f.totalStars === 0 && f.repoCount >= 5, line: (f) => `${f.repoCount} repos, zero stars. Outsider art, technically.` },
  { when: (f) => f.maxStars > 0 && f.maxStars >= f.totalStars * 0.9 && f.totalStars > 100, line: () => `One repo carries the entire account. It knows. It's tired.` },
  { when: (f) => f.topLanguageShare > 0.85 && f.topLanguage !== null && f.repoCount >= 5, line: (f) => `${Math.round(f.topLanguageShare * 100)}% ${f.topLanguage}. Monogamous with a programming language. Sweet, honestly.` },
  { when: (f) => f.emptyDescriptions >= 5, line: (f) => `${f.emptyDescriptions} repos with no description. Mystery boxes. Loot unclear.` },
  { when: (f) => f.repoCount > 80, line: (f) => `${f.repoCount} public repos. Not a portfolio — a coping mechanism.` },
  { when: (f) => f.repoCount <= 2 && f.accountYears > 3, line: (f) => `${Math.floor(f.accountYears)} years on GitHub, ${f.repoCount} repos. A lurker with a login.` },
  { when: (f) => f.accountYears < 1, line: () => `Account younger than most sourdough starters. Everything is still possible.` },
  { when: (f) => f.totalStars > 10_000, line: () => `Five-digit stars and still reading roasts about yourself. Grounded. We love it.` },
  { when: (f) => f.forkRatio === 0 && f.repoCount >= 10, line: () => `Zero forks. Never once looked at someone's code and said "mine now". Suspicious levels of originality.` },
  { when: (f) => f.testRepoCount >= 1, line: () => `There's a repo literally named "test" in there. It has been "temporary" for years.` },
  { when: (f) => f.abandonedRepos >= 3, line: (f) => `${f.abandonedRepos} side projects in cryosleep. They'll be revived "next weekend".` },
  { when: (f) => f.bioCliches.length >= 2, line: (f) => `Bio contains "${f.bioCliches.join('" and "')}". The bingo card is filling in.` },
  { when: (f) => f.maxStars >= 100 && f.daysSinceLastPush < 7, line: () => `Still pushing to the popular repo. Feeding the tamagotchi. Respect.` },
  // generic fallbacks — everyone gets 3 roasts, no exceptions
  { when: () => true, line: () => `The commit messages say "fix". Fix what? The Algorithm may never know.` },
  { when: () => true, line: () => `Somewhere in there is a branch named "final-final-2". We both know it.` },
  { when: () => true, line: () => `The READMEs promise a roadmap. The roadmap promises nothing.` },
];

// ---------------------------------------------------------------- Stamps

export interface StampCtx {
  stats: CommunitySliders;
  scored: boolean;
}

/** Rubber-stamp certifications. Weighted random among matching `when`s. */
export const STAMPS: { text: string; when: (c: StampCtx) => boolean; weight?: number }[] = [
  { text: "CERTIFIED GPU POOR", when: (c) => c.stats.gpuHoarding <= 35 },
  { text: "CERTIFIED REPLY GUY", when: (c) => c.stats.yapping >= 65 && c.stats.shipping <= 45 },
  { text: "SHIPS AT 3AM", when: (c) => c.stats.shipping >= 70 },
  { text: "STEALTH MODE (UNEMPLOYED)", when: (c) => c.stats.shipping <= 30 && c.stats.yapping <= 40 },
  { text: "10x ENGINEER (SELF-REPORTED)", when: (c) => !c.scored },
  { text: "PEER REVIEWED (BY NOBODY)", when: (c) => c.stats.galaxyBrain >= 60 && c.stats.yapping <= 40 },
  { text: "LINKEDIN THOUGHT LEADER (DEROGATORY)", when: (c) => c.stats.yapping >= 75 },
  { text: "TOUCHES PROD ON FRIDAY", when: (c) => c.stats.shipping >= 60 },
  { text: "VRAM INSUFFICIENT", when: (c) => c.stats.gpuHoarding <= 25 },
  { text: "COMPUTE ENTITLED", when: (c) => c.stats.gpuHoarding >= 70 },
  { text: "AGREES IN MEETINGS ONLY", when: (c) => !c.scored && c.stats.yapping >= 55 },
  { text: "GALAXY BRAIN (UNSUPERVISED)", when: (c) => c.stats.galaxyBrain >= 75 },
  { text: "PROMPT ENGINEER (RECOVERING)", when: (c) => c.stats.galaxyBrain <= 40 },
  { text: "DOES NOT READ DOCS", when: () => true, weight: 0.5 },
  { text: "BUILT DIFFERENT (CITATION NEEDED)", when: (c) => c.stats.shipping >= 55 && c.stats.galaxyBrain >= 55 },
  { text: "YAML SURVIVOR", when: () => true, weight: 0.5 },
  { text: "IN STEALTH (ALLEGEDLY)", when: (c) => c.stats.shipping <= 40 },
  { text: "VERIFIED HUMAN (PROBABLY)", when: () => true, weight: 0.4 },
  { text: "GRADIENT DESCENT ENJOYER", when: (c) => c.stats.gpuHoarding >= 50 },
  { text: "TECHNICAL COFOUNDER (THE OTHER KIND)", when: (c) => c.stats.yapping >= 60 && c.stats.gpuHoarding <= 45 },
];

export function pickStamp(ctx: StampCtx, random: () => number = Math.random): string {
  const eligible = STAMPS.filter((s) => s.when(ctx));
  const total = eligible.reduce((sum, s) => sum + (s.weight ?? 1), 0);
  let roll = random() * total;
  for (const stamp of eligible) {
    roll -= stamp.weight ?? 1;
    if (roll <= 0) return stamp.text;
  }
  return eligible[eligible.length - 1]?.text ?? "VERIFIED HUMAN (PROBABLY)";
}
