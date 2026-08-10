import { test } from "node:test";
import assert from "node:assert/strict";
import { getAllCards } from "../../lib/cards";
import {
  draftChoicesFor,
  draftOpponentFor,
  GAUNTLET_RUNGS,
  gauntletLadderFor,
  LEAGUE_SIZE,
  leagueEntrantsFor,
  parseDraft,
  parseGauntlet,
  parseLeague,
  resolveTagTeam,
  runLeague,
  sameFamily,
  tagOpponentsFor,
} from "../../lib/modes";

const CARDS = getAllCards();
const DAY = "2026-08-11";
const WEEK = "2026-W33";

test("gauntlet: ladder is deterministic, 5 rungs, ratings rise", () => {
  const a = gauntletLadderFor(CARDS, DAY);
  const b = gauntletLadderFor(CARDS, DAY);
  assert.deepEqual(a.map((c) => c.id), b.map((c) => c.id));
  assert.equal(a.length, GAUNTLET_RUNGS);
  for (let i = 1; i < a.length; i++) {
    assert.ok(a[i].rating >= a[i - 1].rating, `rung ${i + 1} must not be easier`);
  }
  // a different day deals a different tower (overwhelmingly)
  const c = gauntletLadderFor(CARDS, "2026-08-12");
  assert.notDeepEqual(a.map((x) => x.id), c.map((x) => x.id));
});

test("draft: three loaners, never owned, deterministic given the binder", () => {
  const owned = new Set(["openai", "nvidia", "sam-altman"]);
  const a = draftChoicesFor(CARDS, owned, DAY);
  const b = draftChoicesFor(CARDS, owned, DAY);
  assert.deepEqual(a.map((c) => c.id), b.map((c) => c.id));
  assert.equal(a.length, 3);
  for (const c of a) {
    assert.ok(!owned.has(c.id), `${c.id} is owned`);
    assert.notEqual(c.type, "artifact");
  }
  // the loaner's opponent is nearby in rating and never the loaner
  const foe = draftOpponentFor(CARDS, a[0], DAY);
  assert.notEqual(foe.id, a[0].id);
  assert.ok(Math.abs(foe.rating - a[0].rating) <= 6);
});

test("tag team: deterministic outcome, family pairs carry the aura", () => {
  const [oa, ob] = tagOpponentsFor(CARDS, DAY);
  assert.notEqual(oa.id, ob.id);
  const nvidia = CARDS.find((c) => c.id === "nvidia")!;
  const jensen = CARDS.find((c) => c.id === "jensen-huang")!;
  const openai = CARDS.find((c) => c.id === "openai")!;
  assert.ok(sameFamily("nvidia", "jensen-huang"));
  assert.ok(!sameFamily("nvidia", "openai"));
  const one = resolveTagTeam([nvidia, jensen], [oa, ob]);
  const two = resolveTagTeam([nvidia, jensen], [oa, ob]);
  assert.equal(one.winner, two.winner);
  assert.equal(one.bouts.length, 4);
  assert.ok(one.aura);
  assert.ok(!resolveTagTeam([nvidia, openai], [oa, ob]).aura);
});

test("league: pads to 8 with cards, bracket is deterministic", () => {
  const prospects = [
    { handle: "octocat", rating: 71, stats: { shipping: 70, yapping: 60, galaxyBrain: 65, gpuHoarding: 50 }, at: "2026-08-01" },
  ];
  const entrants = leagueEntrantsFor(CARDS, prospects, WEEK);
  assert.equal(entrants.length, LEAGUE_SIZE);
  assert.equal(entrants.filter((e) => e.isHandle).length, 1);
  assert.ok(entrants.some((e) => e.side.label === "@octocat"));
  const a = runLeague(entrants, WEEK);
  const b = runLeague(entrants, WEEK);
  assert.equal(a.champion.label, b.champion.label);
  assert.deepEqual(a.rounds.map((r) => r.length), [4, 2, 1]);
});

test("mode day/week states reset on rollover", () => {
  const staleG = JSON.stringify({ day: "2020-01-01", cardId: "openai", rung: 4, out: false, crowned: false });
  assert.equal(parseGauntlet(staleG).rung, 0);
  const staleD = JSON.stringify({ day: "2020-01-01", used: true, pickedId: "x", won: true });
  assert.equal(parseDraft(staleD).used, false);
  const staleL = JSON.stringify({ week: "2020-W01", ran: true });
  assert.equal(parseLeague(staleL).ran, false);
});
