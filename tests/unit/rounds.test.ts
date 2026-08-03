import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CAP_TABLE_MAX,
  capTableWith,
  DILIGENCE,
  generateRound,
  INVESTORS,
  MEETINGS,
  ROUND_AMOUNTS,
  roundShareText,
  SIGN_LINES,
  SOURCING,
  specialFor,
  TERMS,
  WIRING,
  type CapTableRow,
} from "../../lib/rounds";

/** A few years of mocked ISO weeks. */
const weeks = (years: number): string[] => {
  const out: string[] = [];
  for (let y = 2026; y < 2026 + years; y++)
    for (let w = 1; w <= 52; w++) out.push(`${y}-W${String(w).padStart(2, "0")}`);
  return out;
};

test("pools are the ordered sizes and hold no duplicates", () => {
  const pools: [string, string[], number][] = [
    ["investors", INVESTORS, 30],
    ["terms", TERMS, 25],
    ["diligence", DILIGENCE, 10],
    ["sourcing", SOURCING, 10],
    ["wiring", WIRING, 8],
    ["meetings", MEETINGS, 8],
    ["sign lines", SIGN_LINES, 8],
  ];
  for (const [name, pool, size] of pools) {
    assert.equal(pool.length, size, `${name} sized ${pool.length}, wanted ${size}`);
    assert.equal(new Set(pool).size, pool.length, `${name} repeats an entry`);
  }
});

test("a week's round is fully deterministic", () => {
  const a = generateRound("2026-W32");
  const b = generateRound("2026-W32");
  assert.deepEqual(a, b);
});

test("different weeks produce different rounds", () => {
  const headlines = new Set(weeks(1).map((w) => generateRound(w).headline));
  // 52 weeks over 8 templates × 30 investors — near-total variety expected
  assert.ok(headlines.size >= 40, `only ${headlines.size} distinct headlines in a year`);
});

test("special weeks land near 1 in 6 over six years of mocked weeks", () => {
  const all = weeks(6);
  const specials = all.filter((w) => specialFor(w) !== null);
  const rate = specials.length / all.length;
  assert.ok(rate > 1 / 12 && rate < 1 / 3, `special rate ${rate.toFixed(3)}`);
  // and all three kinds actually occur
  const kinds = new Set(specials.map((w) => specialFor(w)));
  assert.deepEqual([...kinds].sort(), ["bridge", "down", "oversub"]);
});

test("special weeks change the amount, button and copy together", () => {
  for (const w of weeks(6)) {
    const round = generateRound(w);
    if (round.special === "down") {
      assert.equal(round.amount, 150);
      assert.equal(round.button, "Take it →");
      assert.equal(round.preline, "Market conditions. Their words.");
      assert.ok(round.headline.includes("reluctantly"));
    } else if (round.special === "oversub") {
      assert.equal(round.amount, 400);
      assert.equal(round.button, "Sign it all →");
      assert.ok(round.investor2 && round.investor2 !== round.investor);
      assert.ok(round.headline.includes(round.investor2!));
    } else if (round.special === "bridge") {
      assert.equal(round.amount, 200);
      assert.equal(round.button, "Shake on it →");
      assert.ok(round.headline.includes("bridge to the next bridge"));
    } else {
      assert.equal(round.amount, ROUND_AMOUNTS.base);
      assert.equal(round.button, "Sign it →");
    }
    // the headline always states the actual amount it pays
    assert.ok(round.headline.includes(String(round.amount)), round.headline);
    // the sign line is resolved — no template slot leaks through
    assert.ok(!round.signLine.includes("{"), round.signLine);
  }
});

test("share text carries amount, investor and terms", () => {
  const round = generateRound("2026-W40");
  const text = roundShareText(round);
  assert.ok(text.includes(String(round.amount)));
  assert.ok(text.includes(round.investor));
  assert.ok(text.includes(round.term));
  assert.ok(text.includes("aiticker.xyz"));
});

test("the cap table caps at 10 and is idempotent per week", () => {
  let rows: CapTableRow[] = [];
  for (let i = 1; i <= 15; i++) {
    rows = capTableWith(rows, { week: `2026-W${String(i).padStart(2, "0")}`, investor: "Uncle Dave", amount: 300 });
  }
  assert.equal(rows.length, CAP_TABLE_MAX);
  // oldest rows fell off, newest kept
  assert.equal(rows[0].week, "2026-W06");
  assert.equal(rows[rows.length - 1].week, "2026-W15");
  // double-claiming a week must not double-list it
  const again = capTableWith(rows, { week: "2026-W15", investor: "Uncle Dave", amount: 300 });
  assert.deepEqual(again, rows);
});
