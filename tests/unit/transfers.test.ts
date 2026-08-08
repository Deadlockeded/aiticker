import { test } from "node:test";
import assert from "node:assert/strict";
import { getAllCards } from "../../lib/cards";
import {
  FRESH_DAYS,
  isFresh,
  TRANSFERS,
  transferShareText,
  transferWatch,
} from "../../lib/transfers";

const cards = getAllCards();

test("ledger integrity: every transfer is sourced, dated, and about a real card", () => {
  assert.ok(TRANSFERS.length >= 1);
  for (const t of TRANSFERS) {
    const card = cards.find((c) => c.id === t.personId);
    assert.ok(card, `${t.personId} has no card`);
    assert.match(t.sourceUrl, /^https:\/\//, `${t.personId} needs a real source`);
    assert.ok(!Number.isNaN(Date.parse(`${t.date}T00:00:00Z`)), `${t.personId} bad date`);
    assert.ok(t.from && t.to && t.role, `${t.personId} incomplete entry`);
    // the card's career must agree with the ledger: the destination is the
    // OPEN chapter — committing a transfer means updating both files
    const last = card!.career?.[card!.career.length - 1];
    assert.ok(last, `${t.personId} has no career rows`);
    assert.equal(last!.org, t.to, `${t.personId}: career last row must be ${t.to}`);
    assert.ok(last!.years.endsWith("–"), `${t.personId}: new chapter must be open-ended`);
  }
});

test("the ledger never invents a fee", () => {
  const t = TRANSFERS[0];
  const text = transferShareText(t, "Someone");
  assert.ok(text.includes("Fee: undisclosed"));
  assert.ok(!/₮|\$|\d+ ?(million|billion|[mMbB]\b)/.test(text));
});

test("freshness window is exactly FRESH_DAYS, then the stamp retires", () => {
  const t = { ...TRANSFERS[0], date: "2026-08-05" };
  assert.ok(isFresh(t, "2026-08-05"));
  assert.ok(isFresh(t, "2026-09-04")); // day 30 — the last day of news
  assert.ok(!isFresh(t, "2026-09-05")); // day 31 — history now
  assert.ok(!isFresh(t, "2026-08-04")); // never fresh before it happened
  assert.equal(FRESH_DAYS, 30);
});

test("the watcher flags moves, ignores everything else, never dedupes across stories", () => {
  const people = [
    { id: "jeff-dean", name: "Jeff Dean" },
    { id: "chris-olah", name: "Chris Olah" },
  ];
  const hits = transferWatch(
    [
      { title: "Jeff Dean and other top AI researchers are leaving Google", url: "https://x" },
      { title: "Jeff Dean publishes a new paper on sparse models" },
      { title: "Startup founder steps down after board dispute" },
      { title: "Chris Olah joins the interpretability institute" },
    ],
    people,
  );
  assert.deepEqual(
    hits.map((h) => h.personId).sort(),
    ["chris-olah", "jeff-dean"],
  );
  // a plain paper headline is not a move; a move without a card name is noise
  assert.ok(hits.every((h) => !h.title.includes("sparse")));
});
