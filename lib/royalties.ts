import royaltiesData from "@/data/royalties.json";
import { getBinder, notifyStore, type Binder } from "./binder";
import { utcDayKey } from "./daily";
import { KEYS, readRaw, writeRaw } from "./storage";
import { grantTicks } from "./wallet";

/**
 * ARTIFACT ROYALTIES — artifacts pay rent when the real world cooperates.
 *
 * The nightly pipeline scans the day's public signals (HN front-page titles,
 * new trending GitHub repos, the wiki-spike list it already computes) against
 * each artifact's keywords and commits the matches to data/royalties.json —
 * deterministic, auditable, identical for every player, $0 infra.
 *
 * HARD RULES: Ticks only, never money. Payouts are triple-capped — max
 * COPIES_CAP copies per artifact, ROYALTY_DAILY_CAP per trigger day, and the
 * grant itself is a CAPPED grant, so royalty income folds inside the standing
 * EARN_DAILY_CAP (see economy.ts) instead of stacking on top of it.
 *
 * SIMPLIFICATION (accepted, do not "fix" silently): owed is computed from
 * copies held AT CLAIM TIME, not copies held on the trigger date. Buying an
 * artifact after a trigger and claiming within the 7-day window pays — the
 * window is short, the caps are low, and per-date holdings would need
 * history we deliberately don't store.
 */

export type RoyaltySignal = "hn" | "gh" | "wiki";

export interface RoyaltyConfig {
  /** Lowercase substring matches against the signal's corpus lines. */
  keywords: string[];
  signal: RoyaltySignal;
  payoutPerCopy: number;
  /** Short theme used in share lines: "the internet did {flavor}". */
  flavor: string;
}

export interface RoyaltyReceipt {
  source: RoyaltySignal;
  headline: string;
  url?: string;
}

export interface RoyaltyEntry {
  date: string;
  artifactId: string;
  payoutPerCopy: number;
  receipt: RoyaltyReceipt;
}

export const LOOKBACK_DAYS = 7;
export const COPIES_CAP = 3;
export const ROYALTY_DAILY_CAP = 60;

/** THE FUND: hold all 8 funding artifacts. */
export const FUNDING_SET = [
  "the-seed-round",
  "the-valuation",
  "the-term-sheet",
  "the-pivot",
  "the-burn-rate",
  "the-down-round",
  "the-stealth-startup",
  "the-exit",
];
export const FUND_MULTIPLIER = 1.5;
export const FUND_ROUND_BONUS = 50;

/**
 * THE EDITORIAL MAP — every artifact's trigger. Substring matching, all
 * lowercase. Tuned so a typical day triggers 1–3 artifacts; The Em Dash is
 * deliberately broad (its near-daily payout IS the joke) at half payout.
 * hn = HN front-page titles · gh = new trending repo names+descriptions ·
 * wiki = names of index cards whose attention spiked ≥ +40% this week.
 */
export const ROYALTY_CONFIG: Record<string, RoyaltyConfig> = {
  // ---- Series 1 ----
  "the-gpu": { signal: "hn", keywords: ["gpu", "nvidia", "cuda", "vram"], payoutPerCopy: 8, flavor: "silicon" },
  "the-paperclip": { signal: "hn", keywords: ["paperclip", "doom", "extinction", "x-risk"], payoutPerCopy: 10, flavor: "doom" },
  "as-an-ai": { signal: "hn", keywords: ["chatgpt", "chatbot"], payoutPerCopy: 6, flavor: "chatbots" },
  "the-context-window": { signal: "hn", keywords: ["context window", "long context", "million token", "context length"], payoutPerCopy: 10, flavor: "context" },
  "the-benchmark": { signal: "wiki", keywords: ["openai", "anthropic", "deepmind", "mistral", "deepseek", "meta ai", "xai"], payoutPerCopy: 8, flavor: "model releases" },
  "the-hallucinated-citation": { signal: "hn", keywords: ["hallucinat", "made up", "fabricated"], payoutPerCopy: 10, flavor: "hallucinations" },
  "ignore-previous-instructions": { signal: "hn", keywords: ["prompt injection", "injection attack"], payoutPerCopy: 10, flavor: "prompt injection" },
  "the-alignment-chart": { signal: "hn", keywords: ["alignment", "aligned ai", "ai safety"], payoutPerCopy: 8, flavor: "alignment discourse" },
  "the-stochastic-parrot": { signal: "hn", keywords: ["stochastic", "parrot"], payoutPerCopy: 10, flavor: "parrots" },
  "vibe-coding": { signal: "gh", keywords: ["vibe", "ai coding", "copilot", "code agent", "coding agent"], payoutPerCopy: 8, flavor: "vibe coding" },
  "the-turing-test": { signal: "hn", keywords: ["turing"], payoutPerCopy: 10, flavor: "turing tests" },
  "agi-in-two-weeks": { signal: "hn", keywords: ["agi", "superintelligen"], payoutPerCopy: 6, flavor: "agi timelines" },
  "the-system-prompt": { signal: "hn", keywords: ["system prompt", "leaked prompt"], payoutPerCopy: 10, flavor: "leaked prompts" },
  "the-compute-cluster": { signal: "hn", keywords: ["data center", "datacenter", "supercomputer", "gigawatt", "compute cluster"], payoutPerCopy: 8, flavor: "compute" },
  // deliberately broad — the near-daily trigger IS the joke, payout halved
  "the-em-dash": { signal: "hn", keywords: ["ai", "llm", "model"], payoutPerCopy: 4, flavor: "prose" },
  "the-leaderboard": { signal: "hn", keywords: ["leaderboard", "lmsys", "elo"], payoutPerCopy: 10, flavor: "leaderboards" },
  "the-waitlist": { signal: "hn", keywords: ["waitlist", "early access", "invite-only"], payoutPerCopy: 10, flavor: "waitlists" },
  "the-demo": { signal: "hn", keywords: ["demo"], payoutPerCopy: 6, flavor: "demos" },
  "the-eval": { signal: "hn", keywords: ["benchmark", "eval"], payoutPerCopy: 8, flavor: "benchmarks" },
  "the-scaling-law": { signal: "hn", keywords: ["scaling law", "compute optimal", "scale is all"], payoutPerCopy: 12, flavor: "scaling laws" },
  "the-jailbreak": { signal: "hn", keywords: ["jailbreak", "jailbroken"], payoutPerCopy: 10, flavor: "jailbreaks" },
  "the-token": { signal: "hn", keywords: ["token"], payoutPerCopy: 6, flavor: "tokens" },
  "the-whitepaper": { signal: "hn", keywords: ["whitepaper", "technical report"], payoutPerCopy: 10, flavor: "whitepapers" },
  "the-latency": { signal: "hn", keywords: ["latency", "real-time", "realtime", "millisecond"], payoutPerCopy: 8, flavor: "latency" },
  "the-wrapper": { signal: "gh", keywords: ["wrapper", "api client", "sdk"], payoutPerCopy: 8, flavor: "wrappers" },
  // ---- Series 1.5 ----
  "the-off-switch": { signal: "hn", keywords: ["shut down", "shutdown", "kill switch", "pause ai"], payoutPerCopy: 10, flavor: "off switches" },
  "the-temperature-slider": { signal: "hn", keywords: ["temperature", "sampling", "top-p"], payoutPerCopy: 10, flavor: "sampling" },
  "the-conference-badge": { signal: "hn", keywords: ["neurips", "icml", "conference", "summit"], payoutPerCopy: 8, flavor: "conferences" },
  "the-arxiv-timestamp": { signal: "hn", keywords: ["arxiv", "paper"], payoutPerCopy: 6, flavor: "papers" },
  "the-rlhf-thumbs-up": { signal: "hn", keywords: ["rlhf", "human feedback", "fine-tun"], payoutPerCopy: 8, flavor: "feedback" },
  // ---- the funding set ----
  "the-seed-round": { signal: "hn", keywords: ["seed round", "pre-seed"], payoutPerCopy: 10, flavor: "seed rounds" },
  "the-valuation": { signal: "hn", keywords: ["valuation", "billion"], payoutPerCopy: 6, flavor: "valuations" },
  "the-term-sheet": { signal: "hn", keywords: ["term sheet", "funding round", "raises $", "raised $"], payoutPerCopy: 10, flavor: "term sheets" },
  "the-pivot": { signal: "hn", keywords: ["pivot", "rebrand"], payoutPerCopy: 10, flavor: "pivots" },
  "the-burn-rate": { signal: "hn", keywords: ["burn rate", "runway", "cash burn"], payoutPerCopy: 10, flavor: "burn rates" },
  "the-down-round": { signal: "hn", keywords: ["down round", "layoffs", "shuts down"], payoutPerCopy: 8, flavor: "corrections" },
  "the-stealth-startup": { signal: "hn", keywords: ["stealth"], payoutPerCopy: 10, flavor: "stealth startups" },
  "the-exit": { signal: "hn", keywords: ["acquire", "acquisition", "merger"], payoutPerCopy: 8, flavor: "exits" },
};

// ---------------------------------------------------------------- matcher

export interface SignalCorpora {
  /** HN front-page story titles (with optional urls, parallel array). */
  hn: { title: string; url?: string }[];
  /** New trending repo "name — description" lines. */
  gh: { title: string; url?: string }[];
  /** Names of index cards whose attention spiked this week. */
  wiki: { title: string; url?: string }[];
}

/**
 * Pure trigger matching — the nightly script and the tests share it. First
 * matching corpus line becomes the receipt.
 */
export function matchTriggers(corpora: SignalCorpora, date: string): RoyaltyEntry[] {
  const out: RoyaltyEntry[] = [];
  for (const [artifactId, cfg] of Object.entries(ROYALTY_CONFIG)) {
    const lines = corpora[cfg.signal] ?? [];
    const hit = lines.find((line) => {
      const text = line.title.toLowerCase();
      return cfg.keywords.some((k) => text.includes(k));
    });
    if (hit) {
      out.push({
        date,
        artifactId,
        payoutPerCopy: cfg.payoutPerCopy,
        receipt: { source: cfg.signal, headline: hit.title.slice(0, 140), url: hit.url },
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------- claim math

export function hasTheFund(binder: Binder): boolean {
  return FUNDING_SET.every((id) => (binder[id]?.copies ?? 0) > 0);
}

export interface OwedLine {
  entry: RoyaltyEntry;
  copies: number;
  amount: number;
  fundBoosted: boolean;
}

export interface Owed {
  total: number;
  lines: OwedLine[];
  dates: string[];
}

const dayMs = 86_400_000;

/** Dates within the lookback window, newest last. */
export function windowDates(today = utcDayKey()): Set<string> {
  const end = Date.parse(`${today}T00:00:00Z`);
  const out = new Set<string>();
  for (let i = 0; i < LOOKBACK_DAYS; i++) {
    out.add(new Date(end - i * dayMs).toISOString().slice(0, 10));
  }
  return out;
}

/**
 * What the player is owed right now: unclaimed trigger days in the window,
 * copies capped, THE FUND multiplier on funding artifacts, then each trigger
 * DAY clamped to ROYALTY_DAILY_CAP (bonus included — the cap is the cap).
 */
export function computeOwed(
  entries: RoyaltyEntry[],
  binder: Binder,
  claimed: Set<string>,
  today = utcDayKey(),
): Owed {
  const window = windowDates(today);
  const fund = hasTheFund(binder);
  const byDate = new Map<string, OwedLine[]>();

  for (const entry of entries) {
    if (!window.has(entry.date) || claimed.has(entry.date)) continue;
    const copies = Math.min(binder[entry.artifactId]?.copies ?? 0, COPIES_CAP);
    if (copies === 0) continue;
    const boosted = fund && FUNDING_SET.includes(entry.artifactId);
    const amount = Math.round(entry.payoutPerCopy * copies * (boosted ? FUND_MULTIPLIER : 1));
    const lines = byDate.get(entry.date) ?? [];
    lines.push({ entry, copies, amount, fundBoosted: boosted });
    byDate.set(entry.date, lines);
  }

  let total = 0;
  const lines: OwedLine[] = [];
  const dates: string[] = [];
  for (const [date, dayLines] of [...byDate.entries()].sort()) {
    const raw = dayLines.reduce((s, l) => s + l.amount, 0);
    const capped = Math.min(raw, ROYALTY_DAILY_CAP);
    // scale each line down proportionally when the day cap bites, so the
    // receipt list still sums to what was actually paid
    const scale = raw > 0 ? capped / raw : 0;
    for (const line of dayLines) {
      lines.push({ ...line, amount: Math.floor(line.amount * scale) });
    }
    total += capped;
    dates.push(date);
  }
  return { total: Math.floor(total), lines, dates };
}

// ---------------------------------------------------------------- client

export const ROYALTY_ENTRIES = royaltiesData as RoyaltyEntry[];

export function getRoyaltyClaimSnapshot(): string {
  return readRaw(KEYS.royalties) ?? "[]";
}

export function parseClaimed(raw: string): string[] {
  try {
    const list = JSON.parse(raw) as string[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** What this player can collect right now. */
export function owedNow(binder = getBinder(), today = utcDayKey()): Owed {
  const claimed = new Set(parseClaimed(getRoyaltyClaimSnapshot()));
  return computeOwed(ROYALTY_ENTRIES, binder, claimed, today);
}

/**
 * Claim everything owed. Idempotent: the trigger DATES are marked claimed
 * (kept to a rolling 60) whether or not the capped wallet grant was clipped
 * by the daily earn budget — simple beats gameable here.
 */
export function claimRoyalties(today = utcDayKey()): number {
  const owed = owedNow(getBinder(), today);
  if (owed.total <= 0) return 0;
  const claimed = parseClaimed(getRoyaltyClaimSnapshot());
  const next = [...new Set([...claimed, ...owed.dates])].sort().slice(-60);
  writeRaw(KEYS.royalties, JSON.stringify(next));
  const paid = grantTicks(owed.total, { reason: "royalties" });
  notifyStore();
  return paid;
}

/** 30-day royalty history for one artifact — the hold-vs-sell surface. */
export function royaltyHistory(
  artifactId: string,
  copies: number,
  today = utcDayKey(),
): { total: number; last: RoyaltyEntry | null } {
  const cutoff = Date.parse(`${today}T00:00:00Z`) - 30 * dayMs;
  const rows = ROYALTY_ENTRIES.filter(
    (e) => e.artifactId === artifactId && Date.parse(`${e.date}T00:00:00Z`) >= cutoff,
  );
  const cappedCopies = Math.min(Math.max(copies, 1), COPIES_CAP);
  const total = rows.reduce((s, e) => s + e.payoutPerCopy * cappedCopies, 0);
  return { total, last: rows[rows.length - 1] ?? null };
}
