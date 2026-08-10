/**
 * Daily market update — Git is the database.
 *
 *   npx tsx scripts/update-market.ts          # writes data/ in place
 *   npx tsx scripts/update-market.ts --dry    # writes data/preview/, prints table
 *
 * Fetch free public signals per card (sequential, 200ms between calls, per-
 * source try/catch + 10s timeouts), merge only successes (a failing source
 * keeps the last known value), recompute ratings, derive the daily price
 * move, append to priceHistory (365 cap), and write JSON with stable key
 * order for clean diffs. Never throws on a source failure.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Card, PricePoint } from "../lib/types";
import { buildRatingContext } from "../lib/rating";
import { seedPriceHistory } from "../lib/market";
import { wikipedia } from "./sources/wikipedia";
import { openalex } from "./sources/openalex";
import { github } from "./sources/github";
import { huggingface } from "./sources/huggingface";
import { hackernews } from "./sources/hackernews";
import type { Source } from "./sources/util";
import { matchTriggers, type RoyaltyEntry, type SignalCorpora } from "../lib/royalties";
import { transferWatch } from "../lib/transfers";

const DRY = process.argv.includes("--dry");
const CARDS_PATH = path.join(process.cwd(), "data", "cards.json");
const OUT_DIR = DRY ? path.join(process.cwd(), "data", "preview") : path.join(process.cwd(), "data");

const SOURCES: Source[] = [wikipedia, openalex, github, huggingface, hackernews];

// price-move tuning: typical daily moves ±0.5–4%, hard clamp ±10%
const K_RATING = 1.5;
const J_ATTENTION = 0.08;
const MAX_MOVE = 0.1;
const HISTORY_CAP = 365;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Stable key order so daily commits diff cleanly. */
const KEY_ORDER = [
  "id", "name", "type", "avatar", "image", "tagline", "rarity", "serial",
  "editionSize", "series", "metrics", "stats", "flavorText", "career",
  "variant", "dailyBlurb", "momentDate", "sides", "wikipediaSlug",
  "openalexId", "githubOrg", "githubUser", "hfOrg", "signals", "priceHistory",
];

function ordered(card: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of KEY_ORDER) if (key in card) out[key] = card[key];
  for (const key of Object.keys(card)) if (!(key in out)) out[key] = card[key];
  return out;
}

async function main() {
  const cards = JSON.parse(readFileSync(CARDS_PATH, "utf8")) as Card[];
  // DROP GATE: cards in a future drop are skipped entirely (no wasted API
  // calls); they join the nightly fetch automatically once released.
  const drops = JSON.parse(readFileSync("data/drops.json", "utf8")) as {
    releaseDate: string;
    cardIds: string[];
  }[];
  const unreleased = new Set(
    drops
      .filter((d) => Date.parse(d.releaseDate) > Date.now())
      .flatMap((d) => d.cardIds),
  );
  const oldContext = buildRatingContext(cards);
  const oldRatings = new Map(cards.map((c) => [c.id, oldContext.computeRating(c)]));

  const tally: Record<string, { ok: number; fail: number }> = {};
  for (const source of SOURCES) tally[source.name] = { ok: 0, fail: 0 };

  for (const card of cards) {
    if (unreleased.has(card.id)) continue;
    for (const source of SOURCES) {
      if (!source.applies(card)) continue;
      try {
        const update = await source.fetchFor(card);
        // merge only fetched keys — a failure never zeroes a stat
        card.signals = { ...card.signals, ...update };
        tally[source.name].ok++;
      } catch (err) {
        tally[source.name].fail++;
        if (DRY) console.error(`  ${source.name} ✗ ${card.id}: ${(err as Error).message}`);
      }
      await sleep(200);
    }
  }

  // recompute ratings against the fresh signal distribution
  const context = buildRatingContext(cards);
  const today = new Date().toISOString();
  const todayDay = today.slice(0, 10);
  const rows: string[] = [];

  for (const card of cards) {
    const oldRating = oldRatings.get(card.id)!;
    const newRating = context.computeRating(card);
    card.stats.rating = newRating;

    // backfill so charts aren't empty on day one
    let history: PricePoint[] = card.priceHistory ?? [];
    if (history.length === 0) {
      history = seedPriceHistory(card, newRating).map((p) => ({
        ...p,
        simulated: true,
      }));
    }
    // idempotent within a day: drop an existing real point for today
    history = history.filter(
      (p) => p.simulated || p.timestamp.slice(0, 10) !== todayDay,
    );

    const prevPrice = history[history.length - 1]?.price ?? newRating * 10;
    const ratingChange = (newRating - oldRating) / Math.max(oldRating, 1);
    const attention = clamp(card.signals?.attentionDelta ?? 0, -100, 100) / 100;
    const move = clamp(K_RATING * ratingChange + J_ATTENTION * attention, -MAX_MOVE, MAX_MOVE);
    const newPrice = Math.round(prevPrice * (1 + move) * 100) / 100;

    history.push({ timestamp: today, price: newPrice });
    card.priceHistory = history.slice(-HISTORY_CAP);

    rows.push(
      `${card.id.padEnd(26)} ${String(oldRating).padStart(3)}→${String(newRating).padEnd(3)} ` +
        `₮${String(prevPrice.toFixed(0)).padStart(5)}→₮${newPrice.toFixed(0).padEnd(5)} ` +
        `(${(move * 100).toFixed(2).padStart(6)}%)  attnΔ ${String(card.signals?.attentionDelta ?? "—").padStart(6)}`,
    );
  }

  // ---- ARTIFACT ROYALTIES: scan the day's signals for artifact triggers ---
  // Two extra keyless fetches (HN front page, new trending repos) plus the
  // wiki-spike list derived from the per-card deltas fetched above. Matches
  // are committed to data/royalties.json — deterministic and auditable, the
  // same trigger list for every player. See lib/royalties.ts for the map.
  const corpora: SignalCorpora = { hn: [], gh: [], wiki: [] };
  try {
    const fp = (await (
      await fetch("https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=30")
    ).json()) as { hits: { title: string; url?: string; objectID: string }[] };
    corpora.hn = fp.hits.map((h) => ({
      title: h.title,
      url: `https://news.ycombinator.com/item?id=${h.objectID}`,
    }));
  } catch (err) {
    console.error("royalties: hn fetch failed —", (err as Error).message);
  }
  try {
    const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
    const gh = (await (
      await fetch(
        `https://api.github.com/search/repositories?q=created:%3E${weekAgo}&sort=stars&order=desc&per_page=30`,
        { headers: process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {} },
      )
    ).json()) as { items?: { full_name: string; description: string | null; html_url: string }[] };
    corpora.gh = (gh.items ?? []).map((r) => ({
      title: `${r.full_name} — ${r.description ?? ""}`,
      url: r.html_url,
    }));
  } catch (err) {
    console.error("royalties: gh fetch failed —", (err as Error).message);
  }
  // wiki spikes: cards whose weekly attention jumped ≥ +40%
  corpora.wiki = cards
    .filter((c) => (c.signals?.attentionDelta ?? 0) >= 40)
    .map((c) => ({ title: c.name }));

  // ---- TRANSFER WATCH: flag possible moves for the human editor ----------
  // Log lines only — the transfer ledger (data/transfers.json) is editorial
  // and is NEVER written by this script. See lib/transfers.ts header.
  const people = cards
    .filter((c) => c.type === "engineer")
    .map((c) => ({ id: c.id, name: c.name }));
  for (const hit of transferWatch(corpora.hn, people)) {
    console.log(`TRANSFER WATCH: ${hit.personId} — "${hit.title}" ${hit.url ?? ""}`);
  }

  const triggers = matchTriggers(corpora, todayDay);
  const royaltiesPath = path.join(process.cwd(), "data", "royalties.json");
  let existing: RoyaltyEntry[] = [];
  try {
    existing = JSON.parse(readFileSync(royaltiesPath, "utf8")) as RoyaltyEntry[];
  } catch {
    // first run
  }
  const cutoff = Date.now() - 30 * 86_400_000;
  const merged = [
    // idempotent within a day: today's entries replace today's entries
    ...existing.filter(
      (e) => e.date !== todayDay && Date.parse(`${e.date}T00:00:00Z`) >= cutoff,
    ),
    ...triggers,
  ].sort((a, b) => a.date.localeCompare(b.date) || a.artifactId.localeCompare(b.artifactId));

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(
    path.join(OUT_DIR, "royalties.json"),
    JSON.stringify(merged, null, 2) + "\n",
  );
  console.log(
    `royalties: ${triggers.length} trigger(s) today — ${triggers.map((t) => t.artifactId).join(", ") || "none"}`,
  );

  // ---- TURF WAR: finalize last ISO week's standings once, from committed
  // prices only. House score = average member 7-day price change at the
  // week boundary. Solo-safe and fabrication-free: it reads the market
  // data this script itself commits, never headlines, never player counts.
  {
    const housesPath = path.join(process.cwd(), "data", "houses.json");
    const turfPath = path.join(process.cwd(), "data", "turfwar.json");
    const houses = JSON.parse(readFileSync(housesPath, "utf8")) as {
      id: string;
      cards: string[];
    }[];
    let turf: { week: string }[] = [];
    try {
      turf = JSON.parse(readFileSync(turfPath, "utf8"));
    } catch {
      turf = [];
    }
    // previous ISO week key (weeks start Monday UTC)
    const weekKeyOf = (d: Date) => {
      const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      const day = (t.getUTCDay() + 6) % 7;
      t.setUTCDate(t.getUTCDate() - day + 3);
      const first = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
      const fDay = (first.getUTCDay() + 6) % 7;
      first.setUTCDate(first.getUTCDate() - fDay + 3);
      const week = 1 + Math.round((t.getTime() - first.getTime()) / (7 * 86_400_000));
      return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
    };
    const lastWeek = weekKeyOf(new Date(Date.now() - 7 * 86_400_000));
    if (!turf.some((t) => t.week === lastWeek)) {
      const move7 = (id: string): number | null => {
        const card = cards.find((c) => c.id === id);
        const h = card?.priceHistory;
        if (!h || h.length < 2) return null;
        const prev = h[Math.max(0, h.length - 8)].price;
        return ((h[h.length - 1].price - prev) / prev) * 100;
      };
      const scored = houses
        .map((house) => {
          const moves = house.cards.map(move7).filter((m): m is number => m !== null);
          const score = moves.length
            ? moves.reduce((s, m) => s + m, 0) / moves.length
            : 0;
          return { houseId: house.id, score: Math.round(score * 100) / 100 };
        })
        .sort((a, b) => b.score - a.score)
        .map((row, i) => ({ ...row, rank: i + 1 }));
      turf.push({
        week: lastWeek,
        standings: scored,
        winner: scored[0].houseId,
      } as (typeof turf)[number]);
      writeFileSync(
        path.join(OUT_DIR, "turfwar.json"),
        JSON.stringify(turf.slice(-26), null, 2) + "\n",
      );
      console.log(
        `turf war: finalized ${lastWeek} — winner ${scored[0].houseId} (${scored[0].score >= 0 ? "+" : ""}${scored[0].score}%)`,
      );
    }
  }

  writeFileSync(
    path.join(OUT_DIR, "cards.json"),
    JSON.stringify(cards.map((c) => ordered(c as unknown as Record<string, unknown>)), null, 2) + "\n",
  );
  writeFileSync(
    path.join(OUT_DIR, "market-meta.json"),
    JSON.stringify({ lastUpdated: today, sources: tally }, null, 2) + "\n",
  );

  console.log(`\n${"card".padEnd(26)} rating   price          move     signal`);
  console.log("-".repeat(84));
  for (const row of rows) console.log(row);
  console.log("-".repeat(84));
  console.log("sources:", JSON.stringify(tally));
  console.log(`${DRY ? "[dry] wrote data/preview/" : "wrote data/"} · ${cards.length} cards`);
}

main();
