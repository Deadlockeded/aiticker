import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeBank, parsePackState } from "../../lib/binder";
import { PACK_BANK_MAX, PACK_INTERVAL_MS } from "../../lib/economy";
import { firstPackRand, pullPack } from "../../lib/packs";
import { getAllCards } from "../../lib/cards";

const T0 = 1_800_000_000_000;

test("fresh profile starts with a full bank", () => {
  const s = parsePackState("null", T0);
  assert.equal(s.bank, PACK_BANK_MAX);
  assert.equal(s.ripped, 0);
});

test("legacy daily allowance converts, capped, marked non-fresh", () => {
  const s = parsePackState(JSON.stringify({ date: "2026-08-03", used: 1 }), T0);
  assert.equal(s.bank, 2); // 3-1 capped at 2
  assert.equal(s.ripped, 99);
  const empty = parsePackState(JSON.stringify({ date: "2026-08-03", used: 3 }), T0);
  assert.equal(empty.bank, 0);
});

test("accrual: one pack per interval, checkpoint advances", () => {
  const s = { bank: 0, ts: T0, ripped: 5 };
  assert.equal(normalizeBank(s, T0 + PACK_INTERVAL_MS - 1).bank, 0);
  const one = normalizeBank(s, T0 + PACK_INTERVAL_MS + 1);
  assert.equal(one.bank, 1);
  assert.equal(one.ts, T0 + PACK_INTERVAL_MS); // remainder carries to next pack
});

test("bank caps at max and idles the timer", () => {
  const s = { bank: 0, ts: T0, ripped: 5 };
  const now = T0 + 5 * PACK_INTERVAL_MS;
  const capped = normalizeBank(s, now);
  assert.equal(capped.bank, PACK_BANK_MAX);
  assert.equal(capped.ts, now); // idle at cap — no banked overflow
});

test("claim-from-full math: next pack lands one interval after the claim", () => {
  // consumePack sets ts = claim time when the bank was full; from that
  // state the next accrual is exactly one interval later
  const afterClaim = { bank: PACK_BANK_MAX - 1, ts: T0, ripped: 1 };
  assert.equal(normalizeBank(afterClaim, T0 + PACK_INTERVAL_MS - 1).bank, PACK_BANK_MAX - 1);
  assert.equal(normalizeBank(afterClaim, T0 + PACK_INTERVAL_MS).bank, PACK_BANK_MAX);
});

test("deterministic first packs: same day+number = same pulls; date/number vary", () => {
  const cards = getAllCards();
  const ids = (dateKey: string, n: number) =>
    pullPack(cards, firstPackRand(dateKey, n)).map((c) => c.id);
  assert.deepEqual(ids("2026-08-03", 1), ids("2026-08-03", 1));
  assert.deepEqual(ids("2026-08-03", 2), ids("2026-08-03", 2));
  assert.notDeepEqual(ids("2026-08-03", 1), ids("2026-08-03", 2));
  assert.notDeepEqual(ids("2026-08-03", 1), ids("2026-08-04", 1));
});
