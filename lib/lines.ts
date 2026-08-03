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

export type Heat = "mild" | "medium" | "crispy";

/**
 * Roast lines with heat tiers. `line` is MEDIUM (the standing register);
 * `mild` is gentle ribbing, `crispy` the sharpest phrasing of the SAME
 * pattern-based joke. Tone rules apply to every tier: patterns not
 * persons, affectionate only, GitHub-footprint jokes only.
 */
export const ROAST_LINES: {
  when: (f: RoastFacts) => boolean;
  line: (f: RoastFacts) => string;
  mild?: (f: RoastFacts) => string;
  crispy?: (f: RoastFacts) => string;
}[] = [
  // specific → generic; picker takes the first 3 matches
  { when: (f) => f.testRepoCount >= 3, line: (f) => `${f.testRepoCount} repos named some variant of "test". Bold archival strategy.`, mild: (f) => `${f.testRepoCount} repos named "test". We have all been there.`, crispy: (f) => `${f.testRepoCount} repos named "test". At this point "test" is the brand.` },
  { when: (f) => f.portfolioCount >= 2, line: (f) => `${f.portfolioCount} portfolio sites. The portfolio is the product now.`, mild: (f) => `${f.portfolioCount} portfolio sites. Thorough.`, crispy: (f) => `${f.portfolioCount} portfolio sites, zero portfolio pieces. The frame is the art.` },
  { when: (f) => f.bioCliches.includes("stealth"), line: () => `Bio says "stealth". The 47 public repos disagree.`, mild: () => `Bio says "stealth". Cozy.`, crispy: () => `"Stealth" bio, public repos. The only person it is hidden from is you.` },
  { when: (f) => f.bioCliches.includes("visionary"), line: () => `Self-described visionary. The commits describe something else.` },
  { when: (f) => f.bioCliches.includes("building"), line: () => `Bio says "building". Building what? When? The people deserve answers.` },
  { when: (f) => f.forkRatio > 0.7, line: (f) => `${Math.round(f.forkRatio * 100)}% forks. A museum curator with commit access.`, mild: (f) => `${Math.round(f.forkRatio * 100)}% forks. A well-stocked reference shelf.`, crispy: (f) => `${Math.round(f.forkRatio * 100)}% forks. Ctrl+C as a career arc.` },
  { when: (f) => f.abandonedRepos >= 10, line: (f) => `${f.abandonedRepos} repos untouched for a year+. A graveyard with a README policy.`, mild: (f) => `${f.abandonedRepos} quiet repos. They are resting.`, crispy: (f) => `${f.abandonedRepos} abandoned repos. The commit graph qualifies as a memorial garden.` },
  { when: (f) => f.daysSinceLastPush > 365, line: () => `Last push: over a year ago. The repos have filed a missing person report.`, mild: () => `Over a year since a push. Life happens.`, crispy: () => `A year of silence. Even dependabot stopped writing.` },
  { when: (f) => f.daysSinceLastPush > 90 && f.daysSinceLastPush <= 365, line: (f) => `${Math.round(f.daysSinceLastPush)} days since the last push. The streak is dead, long live the streak.`, mild: (f) => `${Math.round(f.daysSinceLastPush)} days since a push. A sabbatical.`, crispy: (f) => `${Math.round(f.daysSinceLastPush)} days quiet. The contribution graph looks like morse code for "later".` },
  { when: (f) => f.totalStars === 0 && f.repoCount >= 5, line: (f) => `${f.repoCount} repos, zero stars. Outsider art, technically.`, mild: (f) => `${f.repoCount} repos, stars pending.`, crispy: (f) => `${f.repoCount} repos, zero stars. Performance art without an audience.` },
  { when: (f) => f.maxStars > 0 && f.maxStars >= f.totalStars * 0.9 && f.totalStars > 100, line: () => `One repo carries the entire account. It knows. It's tired.`, mild: () => `One repo does the heavy lifting. A star player.`, crispy: () => `One repo carries the account like a parent at a school play.` },
  { when: (f) => f.topLanguageShare > 0.85 && f.topLanguage !== null && f.repoCount >= 5, line: (f) => `${Math.round(f.topLanguageShare * 100)}% ${f.topLanguage}. Monogamous with a programming language. Sweet, honestly.`, mild: (f) => `${Math.round(f.topLanguageShare * 100)}% ${f.topLanguage}. Loyal.`, crispy: (f) => `${Math.round(f.topLanguageShare * 100)}% ${f.topLanguage}. The language has asked for space.` },
  { when: (f) => f.emptyDescriptions >= 5, line: (f) => `${f.emptyDescriptions} repos with no description. Mystery boxes. Loot unclear.`, mild: (f) => `${f.emptyDescriptions} repos without descriptions. Minimalism.`, crispy: (f) => `${f.emptyDescriptions} undocumented repos. Even their author navigates by vibes.` },
  { when: (f) => f.repoCount > 80, line: (f) => `${f.repoCount} public repos. Not a portfolio — a coping mechanism.`, mild: (f) => `${f.repoCount} public repos. Prolific.`, crispy: (f) => `${f.repoCount} repos. Not a portfolio — a cry for a monorepo.` },
  { when: (f) => f.repoCount <= 2 && f.accountYears > 3, line: (f) => `${Math.floor(f.accountYears)} years on GitHub, ${f.repoCount} repos. A lurker with a login.`, mild: (f) => `${Math.floor(f.accountYears)} years, ${f.repoCount} repos. Quality over quantity.`, crispy: (f) => `${Math.floor(f.accountYears)} years for ${f.repoCount} repos. Geological pace. The commits are sediment.` },
  { when: (f) => f.accountYears < 1, line: () => `Account younger than most sourdough starters. Everything is still possible.` },
  { when: (f) => f.totalStars > 10_000, line: () => `Five-digit stars and still reading roasts about yourself. Grounded. We love it.`, mild: () => `Five-digit stars. Genuinely impressive. That is the whole roast.`, crispy: () => `Five-digit stars and here for validation from a card game. Growth.` },
  { when: (f) => f.forkRatio === 0 && f.repoCount >= 10, line: () => `Zero forks. Never once looked at someone's code and said "mine now". Suspicious levels of originality.` },
  { when: (f) => f.testRepoCount >= 1, line: () => `There's a repo literally named "test" in there. It has been "temporary" for years.` },
  { when: (f) => f.abandonedRepos >= 3, line: (f) => `${f.abandonedRepos} side projects in cryosleep. They'll be revived "next weekend".` },
  { when: (f) => f.bioCliches.length >= 2, line: (f) => `Bio contains "${f.bioCliches.join('" and "')}". The bingo card is filling in.` },
  { when: (f) => f.maxStars >= 100 && f.daysSinceLastPush < 7, line: () => `Still pushing to the popular repo. Feeding the tamagotchi. Respect.` },
  // generic fallbacks — everyone gets 3 roasts, no exceptions
  { when: () => true, line: () => `The commit messages say "fix". Fix what? The Algorithm may never know.`, mild: () => `The commit messages are brief. Efficient.`, crispy: () => `The commit history reads "fix", "fix2", "actual fix". A trilogy.` },
  { when: () => true, line: () => `Somewhere in there is a branch named "final-final-2". We both know it.`, mild: () => `Somewhere in there is a branch that could use a tidy.`, crispy: () => `A branch named "final-final-2" has outlived several startups.` },
  { when: () => true, line: () => `The READMEs promise a roadmap. The roadmap promises nothing.`, mild: () => `The READMEs are optimistic. Keep them that way.`, crispy: () => `The README says "coming soon". The repo's birthday disagrees.` },
];

/** First 3 matching lines at the requested heat (tier falls back to medium). */
export function pickRoasts(facts: RoastFacts, heat: Heat = "medium"): string[] {
  return ROAST_LINES.filter((r) => r.when(facts))
    .slice(0, 3)
    .map((r) => (heat === "mild" ? (r.mild ?? r.line) : heat === "crispy" ? (r.crispy ?? r.line) : r.line)(facts));
}

// ---------------------------------------------------------------- Stats

/** Tier words for any 0–100 stat. */
export function statTier(v: number): { word: string; hot: boolean } {
  if (v >= 95) return { word: "MYTHIC", hot: true };
  if (v >= 85) return { word: "ELITE", hot: true };
  if (v >= 70) return { word: "STRONG", hot: false };
  if (v >= 50) return { word: "SOLID", hot: false };
  if (v >= 30) return { word: "MID", hot: false };
  return { word: "ROUGH", hot: false };
}

/** One-line stat definitions, Editor's voice. Keyed by stat key. */
export const STAT_DEFS: Record<string, string> = {
  innovation: "INNOVATION — how much new they actually make, versus how much they announce. We check.",
  influence: "INFLUENCE — when they talk, who reschedules meetings. Measured in rescheduled meetings.",
  momentum: "MOMENTUM — how fast the world is talking about them right now. Yes, we can measure that.",
  shipping: "SHIPPING — commits that exist versus commits that were promised. The gap is a personality.",
  yapping: "CLOUT — followers, stars, reach. The megaphone, not the message.",
  galaxyBrain: "GALAXY BRAIN — range, depth, citations. The whiteboard energy, quantified.",
  gpuHoarding: "GPU HOARDING — proximity to serious compute. Some people simply run warmer.",
  uselessness: "USELESSNESS — contributes nothing, means everything. The collector's paradox.",
  ubiquity: "UBIQUITY — you cannot escape it. Neither can we. That's the score.",
  lore: "LORE — how much history is packed inside. Museums wish.",
  vibes: "VIBES — unquantifiable. We quantified it anyway. You're welcome.",
};

/** Percentile adjectives for the "More X than n% of the index" line. */
export const STAT_ADJECTIVES: Record<string, string> = {
  innovation: "innovative",
  influence: "influential",
  momentum: "unstoppable",
  uselessness: "useless",
  ubiquity: "inescapable",
  lore: "storied",
  vibes: "vibey",
};

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

// ---------------------------------------------------------------- Ship Meter v2

/**
 * Verdict tiers and category lines for the cofounder check. Same tone rules as
 * everywhere else: patterns not persons, affectionate only, GitHub-footprint
 * jokes only. Every line is picked deterministically from the pair's score, so
 * the same two handles always get the same reading.
 */
export interface ShipTier {
  min: number;
  title: string;
  lines: string[];
}

export const SHIP_TIERS: ShipTier[] = [
  {
    min: 90,
    title: "Found your technical co-founder",
    lines: [
      "Incorporate immediately. Argue about equity later, like professionals.",
      "This is the rare pairing where both of you would actually open the PR.",
      "One of you has the idea, one of you has the terminal. That is a company.",
      "Genuinely complementary. Suspicious. Do it anyway.",
      "The Algorithm has no notes. The Algorithm always has notes.",
      "Ship it before one of you reads a book about management.",
    ],
  },
  {
    min: 70,
    title: "Fundable chemistry",
    lines: [
      "One of you writes tests. One of you writes \"fix later\". Balance.",
      "Strong pairing, provided you agree on the deploy key in advance.",
      "You would survive a launch week. Possibly two.",
      "Complementary flaws, which is rarer than product-market fit.",
      "The gaps line up. The calendars will not, but the gaps do.",
      "Good on paper, and the paper is unusually convincing.",
    ],
  },
  {
    min: 50,
    title: "Accelerator roommates",
    lines: [
      "You'd survive a hackathon together. A pivot, unclear.",
      "Workable, as long as neither of you owns the roadmap alone.",
      "Great for one project. Renegotiate before the second.",
      "The friendship survives. The repo is a coin flip.",
      "You'd build something. You'd both describe it differently.",
      "Compatible until the first merge conflict with feelings in it.",
    ],
  },
  {
    min: 30,
    title: "Advisor relationship at best",
    lines: [
      "Take their coffee meeting. Do not take their equity.",
      "Brilliant apart. A group project together.",
      "You'd agree on the vision and nothing after it.",
      "Better as mutuals who occasionally star each other's repos.",
      "One of you would end up writing all the docs, resentfully.",
      "The energy is there. The overlap is not.",
    ],
  },
  {
    min: 0,
    title: "Legally distinct entities",
    lines: [
      "The only thing you'd co-found is a group chat that dies in a week.",
      "Two visionaries. Nobody drives. The demo is a Figma.",
      "Incompatible in a way that would make a great documentary.",
      "The equity split negotiation alone would end this.",
      "You'd both wait for the other to start. Forever, probably.",
      "Remain mutuals. Distant mutuals.",
    ],
  },
];

export function shipTier(pct: number): ShipTier {
  return SHIP_TIERS.find((t) => pct >= t.min)!;
}

/** Category bars: honest computation, funnier presentation. */
export type ShipCategoryKey = "timezone" | "stack" | "naming" | "cadence";

export interface ShipCategory {
  key: ShipCategoryKey;
  name: string;
  /** Lines from worst to best fit — the sub-score picks the band. */
  lines: string[];
}

export const SHIP_CATEGORIES: Record<ShipCategoryKey, ShipCategory> = {
  timezone: {
    key: "timezone",
    name: "Timezone chemistry",
    lines: [
      "Opposite clocks. One of you is always the blocker.",
      "Barely overlapping hours. Async or bust.",
      "A few shared hours a day. Enough for one meeting, not two.",
      "Comfortable overlap. Standups would actually happen.",
      "You're both awake at 2am. Concerning. Compatible.",
    ],
  },
  stack: {
    key: "stack",
    name: "Stack alignment",
    lines: [
      "Nothing in common. The first architecture call is a hostage negotiation.",
      "Different stacks, same instincts. Translation costs apply.",
      "Some overlap. Enough to review each other's code, slowly.",
      "Mostly the same tools. Onboarding is a coffee.",
      "Two devs, one stack. The whiteboard will know peace.",
    ],
  },
  naming: {
    key: "naming",
    name: "Naming philosophy",
    lines: [
      "One writes descriptions. One writes \"stuff\". Pick a standard.",
      "Different conventions, strongly held. This will come up again.",
      "Compatible enough. The README will need a mediator.",
      "Similar instincts. Repos would look like siblings.",
      "final-v2 energy detected on both sides. Kindred.",
    ],
  },
  cadence: {
    key: "cadence",
    name: "Shipping cadence",
    lines: [
      "One ships daily, one ships annually. Someone will be very tired.",
      "Different rhythms. Deadlines would be a genre of argument.",
      "One sprints, one marinates. Someone's writing the docs.",
      "Similar pace. You'd hit the same walls at the same time.",
      "Matched cadence. Terrifying velocity, no brakes.",
    ],
  },
};

/** Absurd equity splits. Pure joke — never advice; the fine print says so. */
export const EQUITY_SPLITS = [
  "50/50. Recorded on a napkin nobody can find.",
  "51/49. Fight about which side is which.",
  "60/40, revisited quarterly, forever.",
  "70/30, with a vesting cliff neither of you understands.",
  "45/45, and 10% to whoever names the company.",
  "50/50 until the first funding round, then a long silence.",
  "1/99, and you both think you're the 99.",
  "Equal shares, unequal group chats.",
];

export function equitySplit(seed: number): string {
  return EQUITY_SPLITS[seed % EQUITY_SPLITS.length];
}
