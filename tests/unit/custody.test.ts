import { test } from "node:test";
import assert from "node:assert/strict";
import { nudgesExhausted, parseCustody, relativeTime } from "../../lib/custody";

// node has no localStorage — readRaw returns null, so the legacy nudge
// key reads as unset and parse is exercised purely on its raw argument.

test("custody parse: fresh, partial, and garbage states", () => {
  const fresh = parseCustody(null);
  assert.equal(fresh.prompted, false);
  assert.deepEqual(fresh.nudged, { rare: false, returning: false });

  const partial = parseCustody(JSON.stringify({ prompted: true }));
  assert.equal(partial.prompted, true);
  assert.equal(partial.nudged.rare, false);

  const garbage = parseCustody("{not json");
  assert.equal(garbage.prompted, false);
});

test("the two-nudge cap is a real cap", () => {
  const one = parseCustody(
    JSON.stringify({ prompted: true, nudged: { rare: true, returning: false } }),
  );
  assert.equal(nudgesExhausted(one), false);
  const both = parseCustody(
    JSON.stringify({ prompted: true, nudged: { rare: true, returning: true } }),
  );
  assert.equal(nudgesExhausted(both), true);
});

test("relative time reads like a person wrote it", () => {
  const now = 1_000_000_000_000;
  assert.equal(relativeTime(now - 10_000, now), "just now");
  assert.equal(relativeTime(now - 5 * 60_000, now), "5m ago");
  assert.equal(relativeTime(now - 3 * 3_600_000, now), "3h ago");
  assert.equal(relativeTime(now - 2 * 86_400_000, now), "2d ago");
});
