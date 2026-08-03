import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeStates, type CollectorState } from "../../lib/sync";

const entry = (copies: number, first = "2026-01-01T00:00:00Z", last = "2026-01-02T00:00:00Z") => ({
  copies,
  firstPulledAt: first,
  lastPulledAt: last,
});

const base = (over: Partial<CollectorState> = {}): CollectorState => ({
  binder: {},
  xp: 0,
  achievements: [],
  battle: { current: 0, best: 0, wins: 0, losses: 0 },
  ...over,
});

test("empty cloud returns local unchanged", () => {
  const local = base({ binder: { openai: entry(2) }, xp: 100 });
  assert.deepEqual(mergeStates(local, null), local);
});

test("empty local adopts cloud", () => {
  const cloud = base({ binder: { openai: entry(3) }, xp: 500, achievements: ["first-pull"] });
  const merged = mergeStates(base(), cloud);
  assert.equal(merged.binder.openai.copies, 3);
  assert.equal(merged.xp, 500);
  assert.deepEqual(merged.achievements, ["first-pull"]);
});

test("dupes take max copies per card, union of cards", () => {
  const local = base({ binder: { openai: entry(2), "the-gpu": entry(1) } });
  const cloud = base({ binder: { openai: entry(5), "ilya-sutskever": entry(1) } });
  const merged = mergeStates(local, cloud);
  assert.equal(merged.binder.openai.copies, 5);
  assert.equal(merged.binder["the-gpu"].copies, 1);
  assert.equal(merged.binder["ilya-sutskever"].copies, 1);
});

test("earliest first-pull and latest last-pull win", () => {
  const local = base({ binder: { openai: entry(1, "2026-01-05T00:00:00Z", "2026-02-01T00:00:00Z") } });
  const cloud = base({ binder: { openai: entry(1, "2026-01-01T00:00:00Z", "2026-01-10T00:00:00Z") } });
  const merged = mergeStates(local, cloud);
  assert.equal(merged.binder.openai.firstPulledAt, "2026-01-01T00:00:00Z");
  assert.equal(merged.binder.openai.lastPulledAt, "2026-02-01T00:00:00Z");
});

test("counters take max, achievements union, giantSlain sticky", () => {
  const local = base({
    xp: 300,
    achievements: ["first-pull", "hot-hand"],
    battle: { current: 2, best: 4, wins: 10, losses: 3, giantSlain: false },
  });
  const cloud = base({
    xp: 250,
    achievements: ["first-pull", "pack-rat"],
    battle: { current: 0, best: 6, wins: 8, losses: 9, giantSlain: true },
  });
  const merged = mergeStates(local, cloud);
  assert.equal(merged.xp, 300);
  assert.deepEqual([...merged.achievements].sort(), ["first-pull", "hot-hand", "pack-rat"]);
  assert.deepEqual(merged.battle, { current: 2, best: 6, wins: 10, losses: 9, giantSlain: true });
});

test("conflict never loses a card from either side", () => {
  const local = base({ binder: { a: entry(1), b: entry(2) } });
  const cloud = base({ binder: { b: entry(1), c: entry(4) } });
  const merged = mergeStates(local, cloud);
  assert.deepEqual(Object.keys(merged.binder).sort(), ["a", "b", "c"]);
  assert.equal(merged.binder.b.copies, 2);
});
