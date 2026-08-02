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
  const oldContext = buildRatingContext(cards);
  const oldRatings = new Map(cards.map((c) => [c.id, oldContext.computeRating(c)]));

  const tally: Record<string, { ok: number; fail: number }> = {};
  for (const source of SOURCES) tally[source.name] = { ok: 0, fail: 0 };

  for (const card of cards) {
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

  mkdirSync(OUT_DIR, { recursive: true });
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
