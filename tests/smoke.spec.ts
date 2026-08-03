import { test, expect, type Page } from "@playwright/test";

/**
 * Smoke suite — the flows a collector actually runs, on a phone viewport.
 * Every page must produce zero console errors and zero same-origin 404s.
 * Remote card art (Wikimedia/favicons) is third-party and excluded from the
 * 404 assertion to keep the suite deterministic offline.
 */

const PAGES = [
  "/",
  "/market",
  "/packs",
  "/arena",
  "/binder",
  "/create",
  "/howto",
  "/about",
  "/cards/openai",
];

// Any card works for proof-state tests — a fresh profile owns nothing.
const UNOWNED_CARD = "/cards/openai";

// Card art is third-party (Wikimedia/favicons) proxied through /_next/image.
// CI runners get rate-limited (429) upstream, so art is blocked in tests —
// CardArt's onError monogram fallback renders instead — and the resulting
// resource-load console noise is excluded from the zero-error assertion.
const ART_URL = /_next\/image|upload\.wikimedia\.org|google\.com|gstatic\.com|avatars\.githubusercontent\.com/;
const RESOURCE_NOISE = /Failed to load resource|net::ERR_FAILED/;

const blockArt = (page: Page) =>
  page.route("**/_next/image**", (route) => route.abort());

function watchErrors(page: Page): { errors: string[]; notFound: string[] } {
  const errors: string[] = [];
  const notFound: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    const src = msg.location()?.url ?? "";
    if (RESOURCE_NOISE.test(text) && (ART_URL.test(text) || ART_URL.test(src))) return;
    errors.push(text);
  });
  page.on("pageerror", (err) => errors.push(String(err)));
  page.on("response", (res) => {
    if (res.status() === 404 && res.url().startsWith("http://localhost:3123")) {
      notFound.push(res.url());
    }
  });
  return { errors, notFound };
}

const seedBinder = (page: Page, ids: string[]) =>
  page.addInitScript((cardIds: string[]) => {
    const now = new Date().toISOString();
    const binder = Object.fromEntries(
      cardIds.map((id) => [id, { copies: 1, firstPulledAt: now, lastPulledAt: now }]),
    );
    localStorage.setItem("ai-index:binder:v1", JSON.stringify(binder));
    // mute first-run captions so flows don't race them
    localStorage.setItem(
      "ai-index:onboarding:v1",
      JSON.stringify({ pack: true, binder: true, nudge: true, arena: true }),
    );
  }, ids);

test.describe("console + assets", () => {
  for (const path of PAGES) {
    test(`renders clean: ${path}`, async ({ page }) => {
      await blockArt(page);
      const watch = watchErrors(page);
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      expect(watch.errors, `console errors on ${path}`).toEqual([]);
      expect(watch.notFound, `404s on ${path}`).toEqual([]);
    });
  }
});

test("rip flow: stack → fan holds until tap → binder; persists", async ({ page }) => {
  await blockArt(page);
  const watch = watchErrors(page);
  await page.goto("/packs");
  await page.getByLabel("Rip the pack").click();
  // tear lands on a facedown stack — nothing reveals without a tap
  await page.getByLabel("Reveal the cards").click({ timeout: 10_000 });
  // one continuous flip+fan: all 3 cards visible at once on 390px
  const fanCards = page.getByRole("button", { name: /^Enlarge / });
  await expect(fanCards).toHaveCount(3);
  for (const card of await fanCards.all()) await expect(card).toBeVisible();
  // THE HOLD: no auto-navigation, ever — still here seconds later
  await page.waitForTimeout(3000);
  await expect(page).toHaveURL(/\/packs/);
  // enlarge sheet works
  await fanCards.first().click();
  await expect(page.getByRole("button", { name: "Close" })).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  // leaving is the user's tap
  await page.getByRole("button", { name: "Add to binder →" }).click();
  await page.waitForURL("**/binder");
  const binder = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("ai-index:binder:v1") ?? "{}"),
  );
  expect(Object.keys(binder).length).toBeGreaterThan(0);
  await page.reload();
  const after = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("ai-index:binder:v1") ?? "{}"),
  );
  expect(Object.keys(after)).toEqual(Object.keys(binder));
  expect(watch.errors).toEqual([]);
});

test("cadence: two banked packs, then an 8h countdown", async ({ page }) => {
  await blockArt(page);
  await page.goto("/packs");
  await page.getByLabel("Rip the pack").click();
  await page.getByLabel("Reveal the cards").click({ timeout: 10_000 });
  // second pack is banked → RIP ANOTHER offered; claim it
  await page.getByRole("button", { name: /Rip another/ }).click();
  await page.getByLabel("Reveal the cards").click({ timeout: 10_000 });
  await expect(page.getByRole("button", { name: /Rip another/ })).not.toBeVisible();
  await page.getByRole("button", { name: "Add to binder →" }).click();
  await page.waitForURL("**/binder");
  // bank empty: the claim window math puts the next pack ~8h out
  await page.goto("/packs");
  await expect(page.getByText(/Next pack in [78]h/).first()).toBeVisible();
});

test("anti-fishing: two fresh profiles pull identical first packs", async ({ browser }) => {
  const ids = async () => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto("http://localhost:3123/packs");
    await page.getByLabel("Rip the pack").click();
    await page.getByLabel("Reveal the cards").click({ timeout: 10_000 });
    const binder = await page.evaluate(() =>
      Object.keys(JSON.parse(localStorage.getItem("ai-index:binder:v1") ?? "{}")).sort(),
    );
    await ctx.close();
    return binder;
  };
  // same UTC day + same pack number → same seed → identical pulls
  // (day-to-day variance is unit-tested against explicit date keys)
  expect(await ids()).toEqual(await ids());
});

test("gallery deck: mobile default, next advances the stack", async ({ page }) => {
  await seedBinder(page, ["openai"]); // a fresh "/" is the first-pack ceremony
  await page.goto("/");
  const next = page.getByLabel("Next card").last();
  await expect(next).toBeVisible();
  // "1 / 75" (spaced) — not serial numbers like "#522/1000" in the hidden grid
  const progress = page.locator("span.tnum", { hasText: /\d+ \/ \d+/ }).last();
  const before = await progress.textContent();
  await next.click();
  await expect(progress).not.toHaveText(before ?? "");
});

test("market renders prices", async ({ page }) => {
  await page.goto("/market");
  const rows = page.locator('a[href^="/cards/"]');
  expect(await rows.count()).toBeGreaterThan(40);
  await expect(page.locator("body")).toContainText("₮");
});

test("arena: full fight completes", async ({ page }) => {
  await seedBinder(page, ["openai"]);
  await page.goto("/arena");
  await page.getByRole("button", { name: /OpenAI/ }).first().click();
  await expect(page.getByText("The Challenger Line")).toBeVisible();
  await page.getByRole("button", { name: "Fight →" }).click();
  await expect(page.getByText(/takes it|Dead heat/)).toBeVisible({ timeout: 20_000 });
});

test("unowned card: readable text, proof art, odds + rip CTA", async ({ page }) => {
  await page.goto(UNOWNED_CARD);
  // the index is public — every word crisp
  await expect(page.getByRole("heading", { name: "OpenAI" }).first()).toBeVisible();
  // only the art is unfinished
  await expect(page.getByText("Not in your binder")).toBeVisible();
  await expect(page.getByText(/per card slot/)).toBeVisible();
  await expect(page.getByText("Rip packs to print your copy")).toBeVisible();
});

test("owned card: full color, binder action, no proof tag", async ({ page }) => {
  await seedBinder(page, ["openai"]);
  await page.goto(UNOWNED_CARD);
  await expect(page.getByText("In your binder →")).toBeVisible();
  await expect(page.getByText("Not in your binder")).not.toBeVisible();
  await expect(page.locator(".proof-veil")).toHaveCount(0);
});

test("gallery shows the collected progress line (no global total)", async ({ page }) => {
  await seedBinder(page, ["openai"]);
  await page.goto("/");
  await expect(page.getByText(/Collected: 1/)).toBeVisible();
  // series-scoped counts only — the total set size is never displayed
  await expect(page.getByText(/Collected: 1\s*\/\s*\d+/)).not.toBeVisible();
});

test("get rated: manual build works without GitHub", async ({ page }) => {
  // block GitHub so the test proves the manual path never needs it
  await page.route("https://api.github.com/**", (route) => route.abort());
  await page.goto("/create");
  await page.getByRole("button", { name: "Manual build" }).click();
  await page.getByPlaceholder("Ada Lovelace").fill("Test Person");
  await page.getByRole("button", { name: "Face The Algorithm" }).click();
  await expect(page.getByText("manual build")).toBeVisible();
  await expect(page.getByText("Test Person").first()).toBeVisible();
});

test("home state 1: ceremony rips through to readable cards, then binder", async ({ page }) => {
  await blockArt(page);
  await page.goto("/");
  await expect(page.getByText("Tap to rip your first pack.")).toBeVisible();
  await expect(page.getByText("The Hot List")).not.toBeVisible();
  await expect(page.getByText("The Checklist")).not.toBeVisible();
  // the second door in stays put
  await expect(page.getByRole("link", { name: "Roast me" })).toBeVisible();
  // rip ON the landing page: stack → fan of 3 readable cards → HOLD
  await page.getByLabel("Rip the pack").click();
  await page.getByLabel("Reveal the cards").click({ timeout: 10_000 });
  const fanCards = page.getByRole("button", { name: /^Enlarge / });
  await expect(fanCards).toHaveCount(3);
  for (const card of await fanCards.all()) await expect(card).toBeVisible();
  await page.waitForTimeout(2000);
  await expect(page).toHaveURL(/localhost:3123\/$/); // still on the landing page
  await page.getByRole("button", { name: "Add to binder →" }).click();
  await page.waitForURL("**/binder");
});

test("home state 2: returning with packs → pack hero + index", async ({ page }) => {
  await seedBinder(page, ["openai"]);
  await page.goto("/");
  await expect(page.getByLabel("Rip the pack")).toBeVisible();
  await expect(page.getByText(/\d packs? ready/)).toBeVisible();
  await expect(page.getByText("The Hot List")).toBeVisible();
  await expect(page.getByText("The Checklist")).toBeVisible();
});

test("home state 3: returning with no packs → index-first, countdown, no pack", async ({ page }) => {
  await seedBinder(page, ["openai"]);
  await page.addInitScript(() => {
    const d = new Date();
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    localStorage.setItem("ai-index:packs:v1", JSON.stringify({ date: key, used: 3 }));
  });
  await page.goto("/");
  await expect(page.getByText(/Next pack in/)).toBeVisible();
  await expect(page.getByText("The Hot List")).toBeVisible();
  await expect(page.getByLabel("Rip the pack")).not.toBeVisible();
});

test("binder rooms: switcher renders all three skins", async ({ page }) => {
  await blockArt(page);
  // collect 45 real card ids from the market list, then seed them
  await page.goto("/market");
  const ids = await page.$$eval('a[href^="/cards/"]', (els) =>
    [...new Set(els.map((e) => (e.getAttribute("href") ?? "").split("/").pop() ?? ""))]
      .filter(Boolean)
      .slice(0, 45),
  );
  await seedBinder(page, ids);
  await page.goto("/binder");
  await expect(page.getByRole("button", { name: "The Boardroom" })).toBeEnabled();
  await page.getByRole("button", { name: "The Boardroom" }).click();
  await expect(page.getByText("vacant").first()).toBeVisible();
  await page.getByRole("button", { name: "The Call" }).click();
  await expect(page.getByText(/\d+ participants/)).toBeVisible();
  await expect(page.getByText(/Waiting for .* to join/).first()).toBeVisible();
  await page.getByRole("button", { name: "The Binder" }).click();
  await expect(page.getByText(/S1 —/)).toBeVisible();
});

test("drops: unreleased Series 1.5 cards are hidden everywhere", async ({ page }) => {
  await seedBinder(page, ["openai"]);
  await page.goto("/");
  const search = page.getByPlaceholder("Search the index…");
  await search.fill("Goodfellow");
  await expect(page.getByText(/No cards match/)).toBeVisible();
  await page.goto("/market");
  await expect(page.getByText("Ian Goodfellow")).not.toBeVisible();
});

test("about + how it works render", async ({ page }) => {
  await page.goto("/howto");
  await expect(page.getByRole("heading", { name: "How it works" })).toBeVisible();
  await page.goto("/about");
  await expect(page.getByRole("heading", { name: "About" })).toBeVisible();
});
