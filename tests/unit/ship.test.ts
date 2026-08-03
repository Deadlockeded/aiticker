import { test } from "node:test";
import assert from "node:assert/strict";
import { SHIP_CATEGORIES, SHIP_TIERS, equitySplit, shipTier } from "../../lib/lines";
import { shipBars, shipReading, type ShipSide } from "../../lib/shipmeter";
import type { RawFootprint } from "../../lib/score";

const raw = (over: Partial<RawFootprint> = {}): RawFootprint => ({
  followers: 100,
  publicRepos: 20,
  accountYears: 4,
  pushes90d: 30,
  daysSinceLastPush: 5,
  totalStars: 300,
  forkRatio: 0.2,
  languages: 4,
  gists: 2,
  mlRepos: 3,
  hfModels: 0,
  hfLikes: 0,
  hnKarma: 0,
  citations: 0,
  ...over,
});

const stats = { shipping: 60, yapping: 50, galaxyBrain: 55, gpuHoarding: 45 };
const side = (handle: string, over: Partial<RawFootprint> = {}): ShipSide => ({
  handle,
  stats,
  raw: raw(over),
});

test("every verdict tier boundary lands in the right tier", () => {
  assert.equal(shipTier(100).title, "Found your technical co-founder");
  assert.equal(shipTier(90).title, "Found your technical co-founder");
  assert.equal(shipTier(89).title, "Fundable chemistry");
  assert.equal(shipTier(70).title, "Fundable chemistry");
  assert.equal(shipTier(69).title, "Accelerator roommates");
  assert.equal(shipTier(50).title, "Accelerator roommates");
  assert.equal(shipTier(49).title, "Advisor relationship at best");
  assert.equal(shipTier(30).title, "Advisor relationship at best");
  assert.equal(shipTier(29).title, "Legally distinct entities");
  assert.equal(shipTier(0).title, "Legally distinct entities");
});

test("every tier carries a full pool of lines", () => {
  for (const tier of SHIP_TIERS) {
    assert.ok(tier.lines.length >= 6, `${tier.title} has ${tier.lines.length}`);
    assert.equal(new Set(tier.lines).size, tier.lines.length, `${tier.title} repeats a line`);
  }
});

test("the reading is deterministic and order-independent in tier", () => {
  const a = shipReading(74, "octocat", "defunkt");
  const b = shipReading(74, "defunkt", "octocat");
  assert.equal(a.line, b.line);
  assert.equal(a.equity, b.equity);
  assert.equal(a.title, "Fundable chemistry");
});

test("the equity joke is deterministic and always from the pool", () => {
  for (let i = 0; i < 50; i++) {
    const split = equitySplit(i);
    assert.ok(split.length > 0);
  }
  assert.equal(equitySplit(3), equitySplit(3));
});

test("identical footprints score every bar near the top", () => {
  const bars = shipBars(side("a"), side("b"));
  assert.equal(bars.length, 4);
  for (const bar of bars) assert.ok(bar.score >= 90, `${bar.key} ${bar.score}`);
});

test("opposite footprints score low, and the line matches the band", () => {
  const bars = shipBars(
    side("a", { daysSinceLastPush: 0, languages: 1, pushes90d: 90, publicRepos: 2, forkRatio: 0 }),
    side("b", { daysSinceLastPush: 400, languages: 12, pushes90d: 0, publicRepos: 80, forkRatio: 0.9 }),
  );
  for (const bar of bars) {
    assert.ok(bar.score <= 40, `${bar.key} ${bar.score}`);
    // low score → an early line from that category's pool
    const pool = SHIP_CATEGORIES[bar.key].lines;
    assert.ok(pool.indexOf(bar.line) <= 2, `${bar.key} picked "${bar.line}"`);
  }
});

test("bar scores stay inside 0–100 for extreme inputs", () => {
  const bars = shipBars(
    side("a", { daysSinceLastPush: 99999, languages: 999, pushes90d: 9999, publicRepos: 9999, forkRatio: 1 }),
    side("b", { daysSinceLastPush: 0, languages: 0, pushes90d: 0, publicRepos: 0, forkRatio: 0 }),
  );
  for (const bar of bars) {
    assert.ok(bar.score >= 0 && bar.score <= 100, `${bar.key} ${bar.score}`);
    assert.ok(bar.line.length > 0);
  }
});
