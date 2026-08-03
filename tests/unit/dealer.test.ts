import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bandFor,
  dailySpotlight,
  dealChallengers,
  dealerSeed,
  SMALL_BINDER,
  typeOf,
} from "../../lib/dealer";
import { getAllCards } from "../../lib/cards";

const POOL = getAllCards();
const SEED = dealerSeed(12345, "2026-08-03");

const deal = (over: Partial<Parameters<typeof dealChallengers>[0]> = {}) =>
  dealChallengers({
    pool: POOL,
    myRating: 80,
    binderSize: 12,
    seed: SEED,
    dateKey: "2026-08-03",
    ...over,
  });

test("no repeats inside a single deal", () => {
  const deck = deal();
  const ids = deck.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("served cards are held back until the pool is exhausted", () => {
  const first = deal();
  const served = new Set(first.slice(0, 10).map((c) => c.id));
  const second = deal({ served });
  for (const card of second) assert.ok(!served.has(card.id), `${card.id} repeated`);
  // and when everything has been served, the deck refills rather than emptying
  const all = new Set(POOL.map((c) => c.id));
  assert.ok(deal({ served: all }).length > 0);
});

test("never more than two of a type in a row while another type remains", () => {
  // The guarantee is "while an alternative exists": at the very tail of a
  // full 76-card deal only one type can be left, and a run there is forced.
  for (const nonce of [1, 2, 3, 7, 99]) {
    const deck = deal({ seed: dealerSeed(nonce, "2026-08-03") });
    let run = 1;
    for (let i = 1; i < deck.length; i++) {
      run = typeOf(deck[i]) === typeOf(deck[i - 1]) ? run + 1 : 1;
      if (run <= 2) continue;
      const alternativeLeft = deck
        .slice(i)
        .some((c) => typeOf(c) !== typeOf(deck[i]));
      assert.ok(
        !alternativeLeft,
        `run of ${run} ${typeOf(deck[i])} at index ${i} (nonce ${nonce}) with alternatives still undealt`,
      );
    }
  }
});

test("the deck a player actually sees has no run of three", () => {
  // 30 cards is far more than a session swipes through.
  for (const nonce of [1, 2, 3, 7, 99, 404]) {
    const deck = deal({ seed: dealerSeed(nonce, "2026-08-03") }).slice(0, 30);
    let run = 1;
    for (let i = 1; i < deck.length; i++) {
      run = typeOf(deck[i]) === typeOf(deck[i - 1]) ? run + 1 : 1;
      assert.ok(run <= 2, `run of ${run} at index ${i} (nonce ${nonce})`);
    }
  }
});

test("the rating mix interleaves bands rather than blocking them", () => {
  const deck = deal();
  const bands = deck.slice(0, 20).map((c) => bandFor(c.rating, 80));
  assert.ok(new Set(bands).size >= 2, "the first 20 cards are all one band");
  // a boss should turn up reasonably early — that is the point of the mix
  assert.ok(bands.indexOf("boss") !== -1 && bands.indexOf("boss") < 15);
});

test("a small binder is biased toward beatable challengers", () => {
  const beginner = deal({ binderSize: 2, myRating: 70 }).slice(0, 12);
  const veteran = deal({ binderSize: 40, myRating: 70 }).slice(0, 12);
  const share = (deck: typeof beginner) =>
    deck.filter((c) => bandFor(c.rating, 70) === "beatable").length / deck.length;
  assert.ok(
    share(beginner) > share(veteran),
    `beginner ${share(beginner)} should beat veteran ${share(veteran)}`,
  );
  assert.ok(SMALL_BINDER === 5);
});

test("the daily spotlight is stable for a date and opens the deck", () => {
  const a = dailySpotlight(POOL, "2026-08-03");
  const b = dailySpotlight(POOL, "2026-08-03");
  const next = dailySpotlight(POOL, "2026-08-04");
  assert.equal(a!.id, b!.id);
  assert.notEqual(a!.id, next!.id);
  assert.equal(deal()[0].id, a!.id);
});

test("a reshuffle stops pinning the spotlight to the front", () => {
  const opening = deal();
  const reshuffled = deal({ seed: dealerSeed(42, "2026-08-03"), spotlightFirst: false });
  assert.equal(opening[0].id, dailySpotlight(POOL, "2026-08-03")!.id);
  assert.notEqual(reshuffled[0].id, opening[0].id);
});

test("the same seed deals the same deck; a new seed does not", () => {
  const a = deal().map((c) => c.id);
  const b = deal().map((c) => c.id);
  const c = deal({ seed: dealerSeed(777, "2026-08-03") }).map((c) => c.id);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
});

test("the fighter never appears in its own challenger line", () => {
  const deck = deal({ excludeId: "openai" });
  assert.ok(!deck.some((c) => c.id === "openai"));
});
