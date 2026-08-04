import { test } from "node:test";
import assert from "node:assert/strict";
import type { Binder } from "../../lib/binder";
import {
  COPIES_CAP,
  computeOwed,
  FUND_MULTIPLIER,
  FUNDING_SET,
  hasTheFund,
  LOOKBACK_DAYS,
  matchTriggers,
  ROYALTY_CONFIG,
  ROYALTY_DAILY_CAP,
  windowDates,
  type RoyaltyEntry,
  type SignalCorpora,
} from "../../lib/royalties";
import { getAllCards } from "../../lib/cards";

const CORPORA: SignalCorpora = {
  hn: [
    { title: "Nvidia announces new GPU with 1TB VRAM", url: "https://example.com/1" },
    { title: "Show HN: My weekend project", url: "https://example.com/2" },
    { title: "Startup emerges from stealth with $2B valuation" },
  ],
  gh: [{ title: "acme/llm-wrapper — a thin wrapper around every model API" }],
  wiki: [{ title: "OpenAI" }],
};

test("every artifact has a royalty config, and no config is orphaned", () => {
  const artifacts = getAllCards().filter((c) => c.type === "artifact" && c.id !== "agi");
  for (const card of artifacts) {
    assert.ok(ROYALTY_CONFIG[card.id], `${card.id} has no royalty config`);
  }
  const ids = new Set(artifacts.map((c) => c.id));
  for (const id of Object.keys(ROYALTY_CONFIG)) {
    assert.ok(ids.has(id), `config for unknown artifact ${id}`);
  }
});

test("trigger matching is deterministic and keyword-correct", () => {
  const a = matchTriggers(CORPORA, "2026-08-04");
  const b = matchTriggers(CORPORA, "2026-08-04");
  assert.deepEqual(a, b);
  const ids = a.map((e) => e.artifactId);
  assert.ok(ids.includes("the-gpu"), "gpu headline should trigger the-gpu");
  assert.ok(ids.includes("the-stealth-startup"), "stealth headline triggers");
  assert.ok(ids.includes("the-valuation"), "valuation headline triggers");
  assert.ok(ids.includes("the-wrapper"), "gh wrapper repo triggers");
  assert.ok(ids.includes("the-benchmark"), "wiki spike of OpenAI triggers");
  // receipts carry the matching headline
  const gpu = a.find((e) => e.artifactId === "the-gpu")!;
  assert.ok(gpu.receipt.headline.includes("Nvidia"));
  assert.equal(gpu.receipt.source, "hn");
});

test("the em dash triggers on a broad day at half payout", () => {
  const day: SignalCorpora = {
    hn: [{ title: "A new AI model does something" }],
    gh: [],
    wiki: [],
  };
  const entries = matchTriggers(day, "2026-08-04");
  const em = entries.find((e) => e.artifactId === "the-em-dash");
  assert.ok(em);
  assert.equal(em!.payoutPerCopy, 4);
});

const binderWith = (ids: [string, number][]): Binder =>
  Object.fromEntries(
    ids.map(([id, copies]) => [
      id,
      { copies, firstPulledAt: "2026-01-01", lastPulledAt: "2026-01-01" },
    ]),
  );

const entry = (date: string, artifactId: string, payoutPerCopy = 8): RoyaltyEntry => ({
  date,
  artifactId,
  payoutPerCopy,
  receipt: { source: "hn", headline: "fixture headline" },
});

const TODAY = "2026-08-04";

test("owed pays per copy, capped at 3 copies", () => {
  const entries = [entry(TODAY, "the-gpu", 8)];
  const few = computeOwed(entries, binderWith([["the-gpu", 2]]), new Set(), TODAY);
  assert.equal(few.total, 16);
  const hoard = computeOwed(entries, binderWith([["the-gpu", 9]]), new Set(), TODAY);
  assert.equal(hoard.total, 8 * COPIES_CAP);
});

test("claimed dates never pay twice, unheld artifacts never pay", () => {
  const entries = [entry(TODAY, "the-gpu")];
  const claimed = computeOwed(entries, binderWith([["the-gpu", 1]]), new Set([TODAY]), TODAY);
  assert.equal(claimed.total, 0);
  const unheld = computeOwed(entries, binderWith([["the-token", 1]]), new Set(), TODAY);
  assert.equal(unheld.total, 0);
});

test("the lookback window is exactly 7 days", () => {
  assert.equal(windowDates(TODAY).size, LOOKBACK_DAYS);
  const entries = [
    entry("2026-08-04", "the-gpu"),
    entry("2026-07-29", "the-gpu"), // day 7 — inside
    entry("2026-07-28", "the-gpu"), // day 8 — outside
  ];
  const owed = computeOwed(entries, binderWith([["the-gpu", 1]]), new Set(), TODAY);
  assert.deepEqual(owed.dates, ["2026-07-29", "2026-08-04"]);
});

test("each trigger day is clamped to the daily royalty cap", () => {
  const entries = [
    entry(TODAY, "the-gpu", 12),
    entry(TODAY, "the-scaling-law", 12),
    entry(TODAY, "the-jailbreak", 12),
  ];
  const binder = binderWith([
    ["the-gpu", 3],
    ["the-scaling-law", 3],
    ["the-jailbreak", 3],
  ]);
  const owed = computeOwed(entries, binder, new Set(), TODAY);
  assert.equal(owed.total, ROYALTY_DAILY_CAP); // raw would be 108
  // the listed receipts sum to (about) what was actually paid
  const listed = owed.lines.reduce((s, l) => s + l.amount, 0);
  assert.ok(Math.abs(listed - ROYALTY_DAILY_CAP) <= owed.lines.length);
  // two capped days stack
  const twoDays = computeOwed(
    [...entries, ...entries.map((e) => ({ ...e, date: "2026-08-03" }))],
    binder,
    new Set(),
    TODAY,
  );
  assert.equal(twoDays.total, ROYALTY_DAILY_CAP * 2);
});

test("THE FUND: all 8 held multiplies funding royalties by 1.5", () => {
  const full = binderWith(FUNDING_SET.map((id) => [id, 1]));
  assert.ok(hasTheFund(full));
  const partial = binderWith(FUNDING_SET.slice(1).map((id) => [id, 1]));
  assert.ok(!hasTheFund(partial));

  const entries = [entry(TODAY, "the-exit", 8), entry(TODAY, "the-gpu", 8)];
  const withGpu = { ...full, ...binderWith([["the-gpu", 1]]) };
  const owed = computeOwed(entries, withGpu, new Set(), TODAY);
  const exit = owed.lines.find((l) => l.entry.artifactId === "the-exit")!;
  const gpu = owed.lines.find((l) => l.entry.artifactId === "the-gpu")!;
  assert.equal(exit.amount, Math.round(8 * FUND_MULTIPLIER));
  assert.ok(exit.fundBoosted);
  assert.equal(gpu.amount, 8); // non-funding artifact unboosted
  assert.ok(!gpu.fundBoosted);
});
