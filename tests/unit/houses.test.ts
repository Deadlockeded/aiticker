import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defectCooldownLeft,
  DIVIDENDS,
  dividendFor,
  HOUSES,
  liveHouseScore,
  parsePledge,
  TURF_WEEKS,
} from "../../lib/houses";
import { getAllCards } from "../../lib/cards";

test("every House card is a real released index card", () => {
  const cards = getAllCards();
  for (const house of HOUSES) {
    assert.ok(house.cards.length >= 2, house.id);
    for (const id of house.cards) {
      const card = cards.find((c) => c.id === id);
      assert.ok(card, `${house.id}: unknown card ${id}`);
      assert.notEqual(card!.type, "artifact", `${house.id}: ${id} is an artifact`);
    }
    assert.ok(house.motto.length > 5, house.id);
  }
  // no card serves two masters
  const all = HOUSES.flatMap((h) => h.cards);
  assert.equal(new Set(all).size, all.length);
});

test("turf war standings cover every House exactly once", () => {
  for (const wk of TURF_WEEKS) {
    assert.equal(wk.standings.length, HOUSES.length, wk.week);
    const ids = wk.standings.map((s) => s.houseId).sort();
    assert.deepEqual(ids, HOUSES.map((h) => h.id).sort());
    // ranks are 1..n and the winner is rank 1
    const byRank = [...wk.standings].sort((a, b) => a.rank - b.rank);
    assert.deepEqual(byRank.map((s) => s.rank), byRank.map((_, i) => i + 1));
    assert.equal(byRank[0].houseId, wk.winner);
    // scores are ordered with rank
    for (let i = 1; i < byRank.length; i++) {
      assert.ok(byRank[i - 1].score >= byRank[i].score, wk.week);
    }
  }
});

test("dividend tiers: 1st, 2nd, everyone else", () => {
  assert.equal(dividendFor(1), DIVIDENDS.first);
  assert.equal(dividendFor(2), DIVIDENDS.second);
  assert.equal(dividendFor(3), DIVIDENDS.others);
  assert.equal(dividendFor(5), DIVIDENDS.others);
});

test("defection cooldown counts 14 days from the pledge", () => {
  const now = Date.parse("2026-08-09T12:00:00Z");
  const fresh = parsePledge(
    JSON.stringify({ houseId: "house-nvidia", pledgedAt: "2026-08-08T12:00:00Z" }),
  );
  assert.equal(defectCooldownLeft(fresh, now), 13);
  const seasoned = parsePledge(
    JSON.stringify({ houseId: "house-nvidia", pledgedAt: "2026-07-20T12:00:00Z" }),
  );
  assert.equal(defectCooldownLeft(seasoned, now), 0);
  // never pledged = free to pledge
  assert.equal(defectCooldownLeft(parsePledge(null), now), 0);
});

test("live scoring averages real member price moves", () => {
  const cards = getAllCards();
  for (const house of HOUSES) {
    const score = liveHouseScore(house, cards);
    assert.ok(Number.isFinite(score), house.id);
    assert.ok(Math.abs(score) < 200, `${house.id} scored ${score}% — implausible`);
  }
});
