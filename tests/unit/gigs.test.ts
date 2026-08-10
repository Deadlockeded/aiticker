import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BOARD_SIZE,
  boardFor,
  GIG_POOL,
  gigProgress,
  parseGigs,
  WEEKLY_GIGS,
  weeklyGigFor,
} from "../../lib/gigs";

test("the daily board is deterministic and unique per day", () => {
  const a = boardFor("2026-08-09");
  const b = boardFor("2026-08-09");
  assert.deepEqual(a.map((g) => g.id), b.map((g) => g.id));
  assert.equal(a.length, BOARD_SIZE);
  assert.equal(new Set(a.map((g) => g.id)).size, BOARD_SIZE);
});

test("variety rules hold across a year of boards", () => {
  for (let i = 0; i < 365; i++) {
    const d = new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10);
    const board = boardFor(d);
    assert.equal(board.length, BOARD_SIZE, d);
    // never three of one category
    const cats = board.map((g) => g.cat);
    for (const c of new Set(cats)) {
      assert.ok(cats.filter((x) => x === c).length <= 2, `${d}: 3× ${c}`);
    }
    // always at least one sub-minute gig
    assert.ok(board.some((g) => g.quick), `${d}: no quick gig`);
  }
});

test("weekly gig is ISO-week seeded and stable", () => {
  assert.equal(weeklyGigFor("2026-W32").id, weeklyGigFor("2026-W32").id);
  const picks = new Set(
    Array.from({ length: 20 }, (_, i) => weeklyGigFor(`2026-W${10 + i}`).id),
  );
  assert.ok(picks.size > 1, "the weekly gig should rotate");
  for (const g of WEEKLY_GIGS) assert.ok(g.pay === 150);
});

test("day and week rollovers reset the right halves", () => {
  const stale = JSON.stringify({
    day: "2020-01-01",
    counts: { pack_open: 5 },
    claimed: ["rip-one"],
    bonusPaid: true,
    week: "2020-W01",
    weekCounts: { arena_win: 9 },
    weekClaimed: true,
    boardsCleared: { "2020-W01": 3 },
  });
  const s = parseGigs(stale);
  assert.deepEqual(s.counts, {});
  assert.deepEqual(s.claimed, []);
  assert.equal(s.bonusPaid, false);
  assert.deepEqual(s.weekCounts, {});
  assert.equal(s.weekClaimed, false);
  // board-clear history survives rollovers (dividend bonus lookback)
  assert.equal(s.boardsCleared["2020-W01"], 3);
});

test("progress clamps at the target", () => {
  const gig = GIG_POOL.find((g) => g.id === "win-two")!;
  const s = parseGigs(null);
  s.counts.arena_win = 7;
  assert.equal(gigProgress(gig, s), 2);
});

test("every gig pays and reads like the magazine", () => {
  for (const g of [...GIG_POOL, ...WEEKLY_GIGS]) {
    assert.ok(g.pay > 0 && g.pay <= 150, g.id);
    assert.ok(g.title.length > 3 && g.subline.length > 3, g.id);
  }
});
