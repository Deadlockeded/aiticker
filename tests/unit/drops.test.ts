import { test } from "node:test";
import assert from "node:assert/strict";
import { isReleased, upcomingDrop } from "../../lib/drops";

const BEFORE = Date.parse("2026-08-20T00:00:00Z");
const AFTER = Date.parse("2026-08-25T00:00:00Z");

test("drop cards are hidden before their release date, live after", () => {
  assert.equal(isReleased("the-off-switch", BEFORE), false);
  assert.equal(isReleased("ian-goodfellow", BEFORE), false);
  assert.equal(isReleased("the-off-switch", AFTER), true);
  assert.equal(isReleased("ian-goodfellow", AFTER), true);
});

test("cards not in any drop are always released", () => {
  assert.equal(isReleased("openai", BEFORE), true);
  assert.equal(isReleased("the-em-dash", 0), true);
});

test("upcoming tease appears only inside the 7-day window", () => {
  const farOut = Date.parse("2026-08-01T00:00:00Z");
  assert.equal(upcomingDrop(farOut), null);
  const nearIn = Date.parse("2026-08-19T00:00:00Z");
  const drop = upcomingDrop(nearIn);
  assert.ok(drop);
  assert.equal(drop!.count, 15);
  assert.equal(drop!.days, 5);
  assert.equal(upcomingDrop(AFTER), null);
});
