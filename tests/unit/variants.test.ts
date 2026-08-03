import { test } from "node:test";
import assert from "node:assert/strict";
import { rollVariant, startSerial, VARIANT_EDITIONS, VARIANT_ODDS } from "../../lib/variants";
import { mulberry32 } from "../../lib/rng";

test("variant roll distribution tracks the published odds", () => {
  const rand = mulberry32(424242);
  const n = 40_000;
  const counts = { base: 0, silver: 0, gold: 0, holo: 0 };
  for (let i = 0; i < n; i++) counts[rollVariant(rand)]++;
  // generous ±35% relative tolerance — sanity, not statistics homework
  for (const v of ["base", "silver", "gold", "holo"] as const) {
    const expected = VARIANT_ODDS[v] * n;
    assert.ok(
      Math.abs(counts[v] - expected) < expected * 0.35,
      `${v}: got ${counts[v]}, expected ~${expected}`,
    );
  }
});

test("serials seed into the low third of the edition and are stable", () => {
  for (const v of ["silver", "gold", "holo"] as const) {
    const s = startSerial("openai", v, 10);
    assert.ok(s >= 1 && s <= Math.max(1, Math.floor(VARIANT_EDITIONS[v] / 3)));
    assert.equal(s, startSerial("openai", v, 10)); // deterministic
  }
  // base seeds from the card's own edition size
  const base = startSerial("openai", "base", 300);
  assert.ok(base >= 1 && base <= 100);
});
