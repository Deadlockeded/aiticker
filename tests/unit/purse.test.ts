import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computePurse,
  DUPE_SALE_MIN,
  EARN_DAILY_CAP,
  EXCHANGE_PACK_COST,
  PURSE_FIRST_WIN,
  PURSE_LOSS,
  PURSE_UPSET_MAX,
  PURSE_WIN,
} from "../../lib/economy";
import { utcWeekKey } from "../../lib/rituals";

test("a loss still pays — Ticks are never staked", () => {
  const p = computePurse({
    won: false,
    myRating: 90,
    foeRating: 60,
    streakAfter: 0,
    firstWinToday: false,
  });
  assert.equal(p.total, PURSE_LOSS);
  assert.equal(p.upset, 0);
  assert.equal(p.streak, 0);
  assert.equal(p.daily, 0);
  assert.ok(p.total > 0);
});

test("upset bonus scales with the rating gap and caps", () => {
  const small = computePurse({ won: true, myRating: 70, foeRating: 75, streakAfter: 1, firstWinToday: false });
  assert.equal(small.upset, 40); // 5 points × 8
  assert.equal(small.total, PURSE_WIN + 40);

  const huge = computePurse({ won: true, myRating: 40, foeRating: 99, streakAfter: 1, firstWinToday: false });
  assert.equal(huge.upset, PURSE_UPSET_MAX);
});

test("beating a weaker card pays no upset bonus", () => {
  const p = computePurse({ won: true, myRating: 95, foeRating: 60, streakAfter: 1, firstWinToday: false });
  assert.equal(p.upset, 0);
});

test("streak milestones fire once, at 3 / 5 / 10", () => {
  const at = (streakAfter: number) =>
    computePurse({ won: true, myRating: 80, foeRating: 80, streakAfter, firstWinToday: false }).streak;
  assert.equal(at(2), 0);
  assert.equal(at(3), 50);
  assert.equal(at(4), 0);
  assert.equal(at(5), 150);
  assert.equal(at(10), 300);
  assert.equal(at(11), 0);
});

test("first win of the day pays once, and only on a win", () => {
  const win = computePurse({ won: true, myRating: 80, foeRating: 80, streakAfter: 1, firstWinToday: true });
  assert.equal(win.daily, PURSE_FIRST_WIN);
  const loss = computePurse({ won: false, myRating: 80, foeRating: 80, streakAfter: 0, firstWinToday: true });
  assert.equal(loss.daily, 0);
});

test("the jackpot fight pays at most one pack, and never two", () => {
  // 59-point upset, on a 10-win streak, first win of the day: the rarest
  // single purse in the game. It can fund one Exchange Pack — that moment is
  // the point — but the daily cap still stops a second.
  const best = computePurse({ won: true, myRating: 40, foeRating: 99, streakAfter: 10, firstWinToday: true });
  assert.equal(best.total, PURSE_WIN + PURSE_UPSET_MAX + 300 + PURSE_FIRST_WIN);
  assert.ok(best.total >= EXCHANGE_PACK_COST);
  assert.ok(Math.min(best.total, EARN_DAILY_CAP) < EXCHANGE_PACK_COST * 2);
});

test("the daily cap keeps any grind under two exchange packs a day", () => {
  // worst case: capped income + both ritual grants on the same day
  const ceiling = EARN_DAILY_CAP + 50 + 300;
  assert.ok(ceiling <= EXCHANGE_PACK_COST * 2);
  assert.ok(DUPE_SALE_MIN > 0);
});

test("week keys roll on Monday UTC and are stable inside a week", () => {
  const mon = utcWeekKey(new Date("2026-08-03T00:00:00Z"));
  const sun = utcWeekKey(new Date("2026-08-09T23:59:00Z"));
  const nextMon = utcWeekKey(new Date("2026-08-10T00:00:00Z"));
  assert.equal(mon, sun);
  assert.notEqual(mon, nextMon);
});
