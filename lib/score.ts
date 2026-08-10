import type { CommunitySliders } from "./create";
import { computeCommunityRating } from "./create";
import { rememberProspect } from "./modes";

/**
 * Client-side public-footprint scoring. Every fetch here runs in the
 * VISITOR'S browser against keyless, CORS-friendly APIs (GitHub REST, HF
 * Hub, Algolia HN, OpenAlex). Nothing is stored or transmitted anywhere
 * except the visitor's own local/sessionStorage — keep it that way.
 *
 * Stat formulas (all 0–100, log-scaled so legends don't hit invisible caps):
 * - Shipping     = push events in the last 90 days + how recently anything
 *                  was pushed (recency decays with a half-life).
 * - Clout        = followers + total repo stars (+ a dash of HN karma).
 * - Galaxy Brain = language diversity + gists + OpenAlex citations when the
 *                  display name unambiguously matches an author.
 * - GPU Hoarding = ML-topic repos + HF models/likes.
 *
 * Calibration goal: empty profile ≈ 15, normally active dev 40–70,
 * legend 85+. All knobs live in CALIBRATION.
 */

export const CALIBRATION = {
  /** Baseline every stat starts from (the "empty profile ≈ 15" floor). */
  floor: 14,
  shipping: {
    pushCap: 120, // 90-day push events that count as "maximum shipping"
    recencyHalfLifeDays: 45,
    pushWeight: 0.65,
    recencyWeight: 0.35,
  },
  clout: {
    followersCap: 20_000,
    starsCap: 60_000,
    karmaCap: 50_000,
    followersWeight: 0.45,
    starsWeight: 0.45,
    karmaWeight: 0.1,
  },
  galaxyBrain: {
    languageCap: 10,
    gistCap: 80,
    citationCap: 100_000,
    languageWeight: 0.5,
    gistWeight: 0.15,
    citationWeight: 0.35,
  },
  gpuHoarding: {
    mlRepoCap: 20,
    hfModelCap: 40,
    hfLikeCap: 2_000,
    mlRepoWeight: 0.5,
    hfModelWeight: 0.25,
    hfLikeWeight: 0.25,
  },
} as const;

const ML_KEYWORDS = [
  "ml", "machine-learning", "deep-learning", "llm", "llms", "ai",
  "pytorch", "tensorflow", "jax", "cuda", "transformers", "transformer",
  "diffusion", "rag", "agents", "gpt", "neural", "nlp", "computer-vision",
  "fine-tuning", "embeddings", "inference",
];

export class ScoreError extends Error {
  constructor(
    public kind: "not-found" | "rate-limit" | "network",
    message: string,
  ) {
    super(message);
  }
}

export interface RawFootprint {
  followers: number;
  publicRepos: number;
  accountYears: number;
  pushes90d: number;
  daysSinceLastPush: number;
  totalStars: number;
  forkRatio: number;
  languages: number;
  gists: number;
  mlRepos: number;
  hfModels: number;
  hfLikes: number;
  hnKarma: number;
  citations: number;
}

export interface ScoredProfile {
  handle: string;
  displayName: string;
  avatarUrl: string;
  stats: CommunitySliders;
  raw: RawFootprint;
  verdict: string;
  /** true = fetched fine, false = failed, null = not attempted/provided */
  sources: {
    github: boolean;
    huggingface: boolean | null;
    hackernews: boolean | null;
    openalex: boolean | null;
  };
  fetchedAt: string;
}

// ---------------------------------------------------------------- fetchers

async function ghFetch<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`https://api.github.com${path}`, {
      headers: { Accept: "application/vnd.github+json" },
    });
  } catch {
    throw new ScoreError("network", "Network hiccup talking to GitHub.");
  }
  if (res.status === 404) throw new ScoreError("not-found", "Handle not found on GitHub.");
  if (res.status === 403 || res.status === 429) {
    throw new ScoreError(
      "rate-limit",
      "GitHub is rate-limiting you (60 lookups/hour, it's not personal). Try again in a bit.",
    );
  }
  if (!res.ok) throw new ScoreError("network", `GitHub said ${res.status}.`);
  return (await res.json()) as T;
}

interface GhUser {
  login: string;
  name: string | null;
  avatar_url: string;
  followers: number;
  public_repos: number;
  created_at: string;
}

interface GhRepo {
  stargazers_count: number;
  fork: boolean;
  language: string | null;
  topics?: string[];
  name: string;
  description: string | null;
  pushed_at: string | null;
}

interface GhEvent {
  type: string;
  created_at: string;
}

function isMlRepo(repo: GhRepo): boolean {
  const haystack = [
    ...(repo.topics ?? []),
    repo.name.toLowerCase(),
    (repo.description ?? "").toLowerCase(),
  ].join(" ");
  return ML_KEYWORDS.some((kw) => haystack.includes(kw));
}

// ---------------------------------------------------------------- scoring

/** 0–100 log curve: hits ~50 around 6–8% of cap, 100 at cap. */
function logScale(value: number, cap: number): number {
  if (value <= 0) return 0;
  return Math.min(100, (100 * Math.log(1 + value)) / Math.log(1 + cap));
}

export function scoreFootprint(raw: RawFootprint): CommunitySliders {
  const C = CALIBRATION;
  const lift = (n: number) => Math.round(C.floor + ((100 - C.floor) * n) / 100);

  const recency = 100 * Math.pow(0.5, raw.daysSinceLastPush / C.shipping.recencyHalfLifeDays);
  const shipping =
    C.shipping.pushWeight * logScale(raw.pushes90d, C.shipping.pushCap) +
    C.shipping.recencyWeight * recency;

  const clout =
    C.clout.followersWeight * logScale(raw.followers, C.clout.followersCap) +
    C.clout.starsWeight * logScale(raw.totalStars, C.clout.starsCap) +
    C.clout.karmaWeight * logScale(raw.hnKarma, C.clout.karmaCap);

  // citations only weigh in when OpenAlex matched; renormalize otherwise
  const G = C.galaxyBrain;
  const hasCitations = raw.citations > 0;
  const gWeightSum = G.languageWeight + G.gistWeight + (hasCitations ? G.citationWeight : 0);
  const galaxyBrain =
    (G.languageWeight * logScale(raw.languages, G.languageCap) +
      G.gistWeight * logScale(raw.gists, G.gistCap) +
      (hasCitations ? G.citationWeight * logScale(raw.citations, G.citationCap) : 0)) /
    gWeightSum;

  const H = C.gpuHoarding;
  const gpuHoarding =
    H.mlRepoWeight * logScale(raw.mlRepos, H.mlRepoCap) +
    H.hfModelWeight * logScale(raw.hfModels, H.hfModelCap) +
    H.hfLikeWeight * logScale(raw.hfLikes, H.hfLikeCap);

  return {
    shipping: lift(shipping),
    yapping: lift(clout), // storage key predates the Clout label
    galaxyBrain: lift(galaxyBrain),
    gpuHoarding: lift(gpuHoarding),
  };
}

// ---------------------------------------------------------------- verdicts

/**
 * The Algorithm's Verdict — roasts patterns, never persons. Ordered most
 * specific → most generic; first match wins.
 */
const VERDICTS: { when: (r: RawFootprint, s: CommunitySliders) => boolean; line: string }[] = [
  { when: (r) => r.citations > 10_000, line: "Citation list longer than your changelog. Academia's problem now." },
  { when: (r) => r.followers >= 1_000 && r.pushes90d === 0, line: "Retired legend. The followers stay for the memories." },
  { when: (r) => r.pushes90d >= 60 && r.totalStars < 50, line: "Ships daily into the void. The void is grateful." },
  { when: (r) => r.forkRatio > 0.6, line: "Curator, not creator. The forks carry this portfolio." },
  { when: (r) => r.daysSinceLastPush > 365, line: "In stealth, allegedly." },
  { when: (r, s) => Object.values(s).every((v) => v >= 70), line: "Annoyingly competent. The Algorithm checked twice." },
  { when: (r) => r.totalStars > 10_000 && r.pushes90d < 5, line: "Coasting on that one repo. It is, admittedly, a great repo." },
  { when: (r) => r.hfModels > 10, line: "Drops weights like mixtapes. Someone check on their GPU bill." },
  { when: (r) => r.languages >= 8, line: "Fluent in eight languages, commits in all of them at 2am." },
  { when: (r) => r.gists > 50, line: "A gist for every thought. Every. Single. One." },
  { when: (r) => r.hnKarma > 10_000, line: "Argues professionally on Hacker News. Apparently wins." },
  { when: (r) => r.accountYears < 1 && r.publicRepos < 5, line: "Fresh account. Beginner or burner — The Algorithm suspects burner." },
  { when: (r) => r.followers < 10 && r.pushes90d >= 30, line: "Building in silence. The silence is deafening." },
  { when: (r) => r.publicRepos > 100, line: "Starts projects like browser tabs. Closes neither." },
  { when: (r) => r.mlRepos === 0 && r.hfModels === 0 && r.publicRepos > 3, line: "Zero ML repos in this economy. Genuinely brave." },
  // Funding-flavoured verdicts: patterns only. No real raise, amount, or
  // valuation is ever asserted here (see the hard rule in lines.ts).
  { when: (r, s) => s.yapping >= 70 && s.shipping <= 40, line: "Fundable. Unfortunately." },
  { when: (r) => r.publicRepos <= 3 && r.followers >= 500, line: "Pre-product, post-following. The deck writes itself." },
  { when: (r, s) => s.gpuHoarding >= 70 && s.shipping <= 50, line: "Burn rate: confirmed. Product: pending." },
  { when: (r, s) => s.galaxyBrain >= 75 && s.yapping <= 35, line: "Would raise on a whiteboard photo. Will not post the photo." },
  { when: (r) => r.mlRepos >= 5 && r.totalStars < 100, line: "Deep tech, deeply pre-revenue. The best kind of pre." },
  { when: (r, s) => s.shipping >= 70 && s.yapping >= 70, line: "Ships AND markets. Insufferable at parties, priceless at work." },
  { when: (r) => r.totalStars > 20_000, line: "More stars than a clear desert night. Statistically." },
  { when: (r, s) => Object.values(s).every((v) => v >= 40 && v <= 60), line: "Perfectly balanced. The Algorithm finds this deeply suspicious." },
  { when: (r) => r.publicRepos <= 2 && r.followers < 5, line: "The Algorithm found mostly vibes. Rated the vibes." },
  { when: () => true, line: "The Algorithm has reviewed your commits. It has questions." },
];

export function pickVerdict(raw: RawFootprint, stats: CommunitySliders): string {
  return VERDICTS.find((v) => v.when(raw, stats))!.line;
}

// ---------------------------------------------------------------- pipeline

// ---------------------------------------------------------------- roast facts

import type { RoastFacts } from "./lines";

const ROAST_CACHE_PREFIX = "aiticker:roast:";
const BIO_CLICHES = ["visionary", "building", "stealth"];
const TEST_NAME = /(^|[-_])(test|testing|untitled|new-repo|demo|playground|tmp|temp)([-_]|$)?/i;

/** Extract roastable facts from a public GitHub profile. Session-cached. */
export async function getRoastFacts(handle: string): Promise<{ facts: RoastFacts; cached: boolean }> {
  const key = `${ROAST_CACHE_PREFIX}${handle.toLowerCase()}`;
  try {
    const hit = sessionStorage.getItem(key);
    if (hit) return { facts: JSON.parse(hit) as RoastFacts, cached: true };
  } catch {
    // fetch fresh
  }
  const user = await ghFetch<GhUser & { bio: string | null }>(
    `/users/${encodeURIComponent(handle)}`,
  );
  const repos = await ghFetch<GhRepo[]>(
    `/users/${encodeURIComponent(handle)}/repos?per_page=100&sort=pushed`,
  );
  const own = repos.filter((r) => !r.fork);
  const yearAgo = Date.now() - 365 * 86_400_000;
  const lastPush = repos
    .map((r) => (r.pushed_at ? Date.parse(r.pushed_at) : 0))
    .reduce((a, b) => Math.max(a, b), 0);
  const langCounts = new Map<string, number>();
  for (const repo of own) {
    if (repo.language) langCounts.set(repo.language, (langCounts.get(repo.language) ?? 0) + 1);
  }
  const topLang = [...langCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const bio = (user.bio ?? "").toLowerCase();

  const facts: RoastFacts = {
    handle: user.login,
    repoCount: user.public_repos,
    testRepoCount: repos.filter((r) => TEST_NAME.test(r.name)).length,
    portfolioCount: repos.filter((r) => /portfolio|personal-site|my-site/i.test(r.name)).length,
    forkRatio: repos.length ? repos.filter((r) => r.fork).length / repos.length : 0,
    totalStars: repos.reduce((s, r) => s + r.stargazers_count, 0),
    maxStars: repos.reduce((s, r) => Math.max(s, r.stargazers_count), 0),
    daysSinceLastPush: lastPush ? (Date.now() - lastPush) / 86_400_000 : 9_999,
    abandonedRepos: own.filter((r) => r.pushed_at && Date.parse(r.pushed_at) < yearAgo).length,
    topLanguage: topLang?.[0] ?? null,
    topLanguageShare: topLang && own.length ? topLang[1] / own.length : 0,
    emptyDescriptions: own.filter((r) => !r.description).length,
    bioCliches: BIO_CLICHES.filter((word) => bio.includes(word)),
    accountYears: (Date.now() - Date.parse(user.created_at)) / (365 * 86_400_000),
  };
  try {
    sessionStorage.setItem(key, JSON.stringify(facts));
  } catch {
    // best-effort
  }
  return { facts, cached: false };
}

const CACHE_PREFIX = "aiticker:profile:";

/**
 * Fetch + score a public footprint, sessionStorage-cached per handle so
 * re-comparing doesn't re-burn the visitor's 60/hr GitHub budget.
 */
export async function getScoredProfile(
  handle: string,
  opts: { hf?: string; hn?: string } = {},
): Promise<{ profile: ScoredProfile; cached: boolean }> {
  const key = `${CACHE_PREFIX}${handle.toLowerCase()}`;
  try {
    const hit = sessionStorage.getItem(key);
    if (hit) return { profile: JSON.parse(hit) as ScoredProfile, cached: true };
  } catch {
    // storage unavailable — fetch fresh
  }

  const sources: ScoredProfile["sources"] = {
    github: false,
    huggingface: opts.hf ? false : null,
    hackernews: opts.hn ? false : null,
    openalex: null,
  };

  // GitHub is required — these throw typed ScoreErrors
  const user = await ghFetch<GhUser>(`/users/${encodeURIComponent(handle)}`);
  const repos = await ghFetch<GhRepo[]>(
    `/users/${encodeURIComponent(handle)}/repos?per_page=100&sort=pushed`,
  );
  const events = await ghFetch<GhEvent[]>(
    `/users/${encodeURIComponent(handle)}/events/public?per_page=100`,
  );
  let gists = 0;
  try {
    gists = (await ghFetch<unknown[]>(`/users/${encodeURIComponent(handle)}/gists?per_page=100`)).length;
  } catch {
    // gists are garnish — never fail the run for them
  }
  sources.github = true;

  const cutoff = Date.now() - 90 * 86_400_000;
  const pushes90d = events.filter(
    (e) => e.type === "PushEvent" && Date.parse(e.created_at) > cutoff,
  ).length;
  const lastPush = repos
    .map((r) => (r.pushed_at ? Date.parse(r.pushed_at) : 0))
    .reduce((a, b) => Math.max(a, b), 0);

  const raw: RawFootprint = {
    followers: user.followers,
    publicRepos: user.public_repos,
    accountYears: (Date.now() - Date.parse(user.created_at)) / (365 * 86_400_000),
    pushes90d,
    daysSinceLastPush: lastPush ? (Date.now() - lastPush) / 86_400_000 : 9_999,
    totalStars: repos.reduce((s, r) => s + r.stargazers_count, 0),
    forkRatio: repos.length ? repos.filter((r) => r.fork).length / repos.length : 0,
    languages: new Set(repos.map((r) => r.language).filter(Boolean)).size,
    gists,
    mlRepos: repos.filter(isMlRepo).length,
    hfModels: 0,
    hfLikes: 0,
    hnKarma: 0,
    citations: 0,
  };

  // optional sources — partial failure just leaves the stat contribution out
  if (opts.hf) {
    try {
      const models = await (
        await fetch(`https://huggingface.co/api/models?author=${encodeURIComponent(opts.hf)}&limit=100`)
      ).json() as { likes?: number }[];
      raw.hfModels = models.length;
      raw.hfLikes = models.reduce((s, m) => s + (m.likes ?? 0), 0);
      sources.huggingface = true;
    } catch {
      sources.huggingface = false;
    }
  }
  if (opts.hn) {
    try {
      const hn = await (
        await fetch(`https://hn.algolia.com/api/v1/users/${encodeURIComponent(opts.hn)}`)
      ).json() as { karma?: number };
      raw.hnKarma = hn.karma ?? 0;
      sources.hackernews = true;
    } catch {
      sources.hackernews = false;
    }
  }
  // best-effort author match by display name; skip on any ambiguity
  if (user.name && user.name.trim().includes(" ")) {
    try {
      const data = await (
        await fetch(
          `https://api.openalex.org/authors?search=${encodeURIComponent(user.name)}&per-page=2`,
        )
      ).json() as { results: { display_name: string; cited_by_count: number; works_count: number }[] };
      const [first, second] = data.results ?? [];
      const clean = (s: string) => s.toLowerCase().replace(/[^a-z ]/g, "");
      if (
        first &&
        first.works_count >= 5 &&
        clean(first.display_name) === clean(user.name) &&
        (!second || clean(second.display_name) !== clean(user.name))
      ) {
        raw.citations = first.cited_by_count;
        sources.openalex = true;
      } else {
        sources.openalex = false;
      }
    } catch {
      sources.openalex = false;
    }
  }

  const stats = scoreFootprint(raw);
  const profile: ScoredProfile = {
    handle: user.login,
    displayName: user.name?.trim() || user.login,
    avatarUrl: user.avatar_url,
    stats,
    raw,
    verdict: pickVerdict(raw, stats),
    sources,
    fetchedAt: new Date().toISOString(),
  };
  try {
    sessionStorage.setItem(key, JSON.stringify(profile));
  } catch {
    // cache is best-effort
  }
  // every scored handle joins the GitHub League roster (rolling snapshot)
  rememberProspect(
    profile.handle,
    computeCommunityRating(profile.handle, profile.stats),
    profile.stats,
  );
  return { profile, cached: false };
}
