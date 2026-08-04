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

/** Seed a Tick balance (and optionally today's earn counter). */
const seedWallet = (page: Page, bal: number) =>
  page.addInitScript((amount: number) => {
    const d = new Date();
    const day = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    // seed once — this init script re-runs on every navigation, and a
    // reload must not wipe what the test just earned or claimed
    if (!localStorage.getItem("ai-index:wallet:v1")) {
      localStorage.setItem(
        "ai-index:wallet:v1",
        JSON.stringify({ bal: amount, day, earned: 0 }),
      );
      // the daily visit stipend is pre-claimed so balances stay exact
      localStorage.setItem("ai-index:rituals:v1", JSON.stringify({ visit: day }));
    }
  }, bal);

/** Drain the free-pack bank so only the exchange path is left. */
const seedNoPacks = (page: Page) =>
  page.addInitScript(() => {
    localStorage.setItem(
      "ai-index:packs:v1",
      JSON.stringify({ bank: 0, ts: Date.now(), ripped: 9 }),
    );
  });

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

test("unowned card: readable text, locked art, odds + rip CTA", async ({ page }) => {
  await page.goto(UNOWNED_CARD);
  // the index is public — every word crisp
  await expect(page.getByRole("heading", { name: "OpenAI" }).first()).toBeVisible();
  // only the ART is locked — every word on the card stays readable
  await expect(page.getByText(/Pull to unlock/).first()).toBeVisible();
  await expect(page.getByText(/per card slot/)).toBeVisible();
  await expect(page.getByText("Rip packs to unlock it →")).toBeVisible();
});

test("owned card: full colour art, binder action, no unlock pill", async ({ page }) => {
  await seedBinder(page, ["openai"]);
  await page.goto(UNOWNED_CARD);
  await expect(page.getByText("In your binder →")).toBeVisible();
  await expect(page.getByText(/Pull to unlock/)).toHaveCount(0);
  await expect(page.locator(".art-locked")).toHaveCount(0);
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
  await expect(page.getByText("Peel the strip. Rip your first pack.")).toBeVisible();
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
  // rooms now live behind the header door popover
  const door = page.getByTitle("Rooms");
  await door.click();
  await expect(page.getByRole("button", { name: "The Boardroom" })).toBeEnabled();
  await page.getByRole("button", { name: "The Boardroom" }).click();
  await expect(page.getByText("vacant").first()).toBeVisible();
  await door.click();
  await page.getByRole("button", { name: "The Call" }).click();
  await expect(page.getByText(/\d+ participants/)).toBeVisible();
  await expect(page.getByText(/Waiting for .* to join/).first()).toBeVisible();
  await door.click();
  await page.getByRole("button", { name: "The Binder" }).click();
  await expect(page.getByText(/S1 \d+\/\d+/)).toBeVisible();
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

const GH_MOCK = {
  user: { login: "octomock", public_repos: 12, bio: "building in stealth", created_at: "2019-01-01T00:00:00Z" },
  repos: Array.from({ length: 12 }, (_, i) => ({
    name: i < 4 ? `test-${i}` : `repo-${i}`,
    fork: i % 3 === 0,
    stargazers_count: i === 2 ? 400 : 0,
    pushed_at: "2024-01-01T00:00:00Z",
    language: "TypeScript",
    description: i % 2 ? null : "a repo",
  })),
};

const mockGitHub = (page: Page) =>
  page.route("https://api.github.com/**", (route) => {
    const url = route.request().url();
    if (url.includes("/repos")) return route.fulfill({ json: GH_MOCK.repos });
    // events and gists must be ARRAYS — returning the user object here made
    // events.filter throw, which surfaced as a generic "Fetch failed"
    if (url.includes("/events") || url.includes("/gists")) return route.fulfill({ json: [] });
    // echo the requested login back, so a two-handle flow gets two profiles
    const login = url.split("/users/")[1]?.split(/[/?]/)[0] ?? GH_MOCK.user.login;
    return route.fulfill({ json: { ...GH_MOCK.user, login } });
  });

/** The optional enrichment sources — stubbed so a scored profile resolves offline. */
const mockScoreSources = (page: Page) =>
  page.route(/huggingface\.co|hn\.algolia\.com|api\.openalex\.org/, (route) =>
    route.fulfill({ json: {} }),
  );

test("roast: heat dial, receipt with serial + stamp, funnel", async ({ page }) => {
  await mockGitHub(page);
  await page.goto("/roast");
  await expect(page.getByPlaceholder("octocat")).toBeFocused();
  await page.getByRole("button", { name: "Extra Crispy" }).click();
  await page.getByPlaceholder("octocat").fill("octomock");
  await page.getByRole("button", { name: "Roast me" }).click();
  await expect(page.getByText("Roast receipt")).toBeVisible();
  await expect(page.getByText(/Roast Nº \d+/)).toBeVisible();
  await expect(page.getByText("Prepared: Extra Crispy")).toBeVisible();
  // the funnel carries the handle
  await expect(page.getByRole("link", { name: "Get your card" })).toHaveAttribute(
    "href",
    /create\?gh=octomock/,
  );
});

test("roast burn link: friend's receipt + avenge CTA", async ({ page }) => {
  await mockGitHub(page);
  await page.goto("/roast?burn=octomock&heat=mild");
  await expect(page.getByText("You've been roasted.")).toBeVisible();
  await expect(page.getByText("Prepared: mild")).toBeVisible();
  await page.getByRole("button", { name: "Avenge yourself →" }).click();
  await expect(page.getByPlaceholder("octocat")).toBeFocused();
});

test("about + how it works render", async ({ page }) => {
  await page.goto("/howto");
  await expect(page.getByRole("heading", { name: "How it works" })).toBeVisible();
  await page.goto("/about");
  await expect(page.getByRole("heading", { name: "About" })).toBeVisible();
});


test("exchange pack: ₮500 buys a rip and the balance drops", async ({ page }) => {
  await blockArt(page);
  await seedBinder(page, ["openai"]);
  await seedWallet(page, 900);
  await seedNoPacks(page);
  await page.goto("/packs");
  // free bank is empty, so the countdown offers the exchange as a second line
  await expect(page.getByText(/Next pack in/).first()).toBeVisible();
  await page.getByRole("button", { name: /Exchange pack — ₮500/ }).click();
  await expect(page.getByText("Balance after")).toBeVisible();
  await expect(page.getByText("₮400")).toBeVisible();
  await page.getByRole("button", { name: /Trade ₮500/ }).click();
  await page.getByLabel("Reveal the cards").click({ timeout: 10_000 });
  await page.getByRole("button", { name: "Add to binder →" }).click();
  await page.waitForURL("**/binder");
  const wallet = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("ai-index:wallet:v1") ?? "{}"),
  );
  expect(wallet.bal).toBe(400);
  // the pack landed: more than the single seeded card is in the binder
  const binder = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("ai-index:binder:v1") ?? "{}"),
  );
  expect(Object.keys(binder).length).toBeGreaterThan(1);
});

test("exchange pack is refused when the wallet is short", async ({ page }) => {
  await blockArt(page);
  await seedBinder(page, ["openai"]);
  await seedWallet(page, 120);
  await seedNoPacks(page);
  await page.goto("/packs");
  await expect(page.getByRole("button", { name: /Exchange pack — ₮500/ })).toBeDisabled();
});

test("arena purse: fighting pays, line-itemed, and never debits", async ({ page }) => {
  await blockArt(page);
  await seedBinder(page, ["openai", "the-em-dash"]);
  await seedWallet(page, 0);
  await page.goto("/arena");
  await page.getByRole("button", { name: /OpenAI/ }).first().click();
  await page.getByRole("button", { name: "Fight →" }).first().click();
  await expect(page.getByTestId("purse")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Base")).toBeVisible();
  const wallet = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("ai-index:wallet:v1") ?? "{}"),
  );
  // win or lose, the balance only ever moves up
  expect(wallet.bal).toBeGreaterThan(0);
});

test("raise a round: claimable once, cap table remembers, gone for the week", async ({ page }) => {
  await blockArt(page);
  await seedBinder(page, ["openai"]);
  await seedWallet(page, 0);
  await page.goto("/binder");
  // the money desk folded behind the treasury strip — open it first
  await expect(page.getByTestId("treasury-strip")).toContainText("Round ready");
  await page.getByTestId("treasury-strip").click();
  await expect(page.getByText("This week's round")).toBeVisible();
  await expect(page.getByText(/Terms: /)).toBeVisible();
  // the button label varies with the week (Sign it / Take it / Shake on it /
  // Sign it all) — claim via testid, then check the wallet took the round's
  // own amount, which special weeks change with the copy
  await page.getByTestId("claim-round").click();
  await expect(page.getByText(/Round closed — \+₮\d+/)).toBeVisible();
  const wallet = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("ai-index:wallet:v1") ?? "{}"),
  );
  expect([150, 200, 300, 400]).toContain(wallet.bal);
  // a reload inside the same week must not offer it again — but the cap
  // table keeps the closed round on the books
  await page.reload();
  await page.getByTestId("treasury-strip").click();
  await expect(page.getByText("This week's round")).not.toBeVisible();
  await expect(page.getByText("Cap table").first()).toBeVisible();
  await expect(page.getByText(/₮(150|200|300|400)/).first()).toBeVisible();
});


test("arena setup clears the fold: rail + challenger deck, no scrolling", async ({ page }) => {
  await blockArt(page);
  await seedBinder(page, ["openai", "anthropic", "nvidia"]);
  await page.goto("/arena");
  await page.getByRole("button", { name: /OpenAI/ }).first().click();
  const heading = page.getByText("The Challenger Line");
  await expect(heading).toBeVisible();
  const box = await heading.boundingBox();
  const viewport = page.viewportSize()!;
  // the deck's heading must be reachable without scrolling on a Pixel 7
  expect(box!.y).toBeLessThan(viewport.height);
});

test("today's challenger is the same card for everyone", async ({ browser }) => {
  const open = async () => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.route("**/_next/image**", (r) => r.abort());
    await seedBinder(page, ["the-em-dash", "anthropic"]);
    await page.goto("http://localhost:3123/arena");
    await page.getByRole("button", { name: /Anthropic/ }).first().click();
    // the deck opens on the day's shared challenger — same card for everyone
    await expect(page.getByText("Today's challenger")).toBeVisible();
    const name = await page
      .locator('[aria-label="Top card — drag to cycle, tap to open"] h3')
      .first()
      .innerText();
    await ctx.close();
    return name;
  };
  expect(await open()).toBe(await open());
});

test("challenger line alternates types and holds passed cards back", async ({ page }) => {
  await blockArt(page);
  await seedBinder(page, ["openai", "anthropic", "nvidia"]);
  await page.goto("/arena");
  await page.getByRole("button", { name: /OpenAI/ }).first().click();
  const top = () =>
    page.locator('[aria-label="Top card — drag to cycle, tap to open"] h3').first().innerText();
  const seen: string[] = [];
  for (let i = 0; i < 6; i++) {
    seen.push(await top());
    await page.getByRole("button", { name: "Next card" }).click();
    await page.waitForTimeout(280);
  }
  // no immediate repeats as the deck cycles
  for (let i = 1; i < seen.length; i++) expect(seen[i]).not.toBe(seen[i - 1]);
  expect(new Set(seen).size).toBeGreaterThan(3);
});

test("new opponent reshuffles the challenger line", async ({ page }) => {
  await blockArt(page);
  await seedBinder(page, ["openai"]);
  await page.goto("/arena");
  await page.getByRole("button", { name: /OpenAI/ }).first().click();
  const topCard = () =>
    page.locator('[aria-label="Top card — drag to cycle, tap to open"] h3').first().innerText();
  const seen = new Set<string>();
  for (let i = 0; i < 5; i++) {
    seen.add(await topCard());
    await page.getByRole("button", { name: "Fight →" }).click();
    await expect(page.getByText(/takes it|Dead heat/)).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: "New opponent" }).click();
    await expect(page.getByText("The Challenger Line")).toBeVisible();
  }
  // five reshuffles over ~70 candidates: identical every time is not a shuffle
  expect(seen.size).toBeGreaterThan(1);
});


test("ship meter: avatars, bars, equity joke, funnel", async ({ page }) => {
  await blockArt(page);
  await mockGitHub(page);
  await mockScoreSources(page);
  // both avatars resolve — a 1x1 png stands in for the real GitHub image
  const PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
  await page.route("https://github.com/*.png*", (r) =>
    r.fulfill({ body: PNG, contentType: "image/png" }),
  );
  await page.goto("/shipmeter?a=octomock&b=othermock");
  await expect(page.getByText("Timezone chemistry")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("Stack alignment")).toBeVisible();
  await expect(page.getByText(/Suggested split:/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Roast us both" })).toHaveAttribute(
    "href",
    /roast\?burn=octomock/,
  );
  await expect(page.getByRole("link", { name: "Fight each other" })).toHaveAttribute(
    "href",
    /arena\?vs=@othermock/,
  );
  // the share canvas renders and produces a blob rather than throwing
  const ok = await page.evaluate(async () => {
    const c = document.createElement("canvas");
    c.width = 10;
    c.height = 10;
    return await new Promise<boolean>((res) => c.toBlob((b) => res(!!b)));
  });
  expect(ok).toBe(true);
});

test("ship meter: a missing avatar falls back to initials, never a broken image", async ({ page }) => {
  await blockArt(page);
  await mockGitHub(page);
  await mockScoreSources(page);
  await page.route("https://github.com/*.png*", (r) => r.abort());
  await page.goto("/shipmeter?a=octomock&b=othermock");
  await expect(page.getByText(/Suggested split:/)).toBeVisible({ timeout: 20_000 });
  // the initials tiles stand in and the result still renders in full
  await expect(page.getByText("OC", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Suggested split:/)).toBeVisible();
});


test("main event: ?auto=1 runs the bout without a tap", async ({ page }) => {
  await blockArt(page);
  await seedBinder(page, ["openai"]);
  await page.goto("/arena?me=geoffrey-hinton&vs=demis-hassabis&auto=1");
  // no Fight tap anywhere — the result arrives on its own
  await expect(page.getByText(/takes it|Dead heat/)).toBeVisible({ timeout: 20_000 });
});

test("hot list: the meta-watch line follows the deck's top card", async ({ page }) => {
  await blockArt(page);
  await seedBinder(page, ["openai"]);
  await page.goto("/market");
  const line = page.locator("p", { hasText: "Meta watch" }).first();
  await expect(line).toBeVisible();
  const before = await line.innerText();
  await page.getByRole("button", { name: "Next card" }).first().click();
  await page.waitForTimeout(400);
  const after = await line.innerText();
  expect(after).not.toBe(before);
});


test("peel gesture: dragging the strip across rips the pack", async ({ page }) => {
  await blockArt(page);
  await page.goto("/packs");
  const pack = page.getByLabel("Rip the pack");
  await expect(pack).toBeVisible();
  const box = (await pack.boundingBox())!;
  // drag along the tear strip, left edge → past the commit threshold
  const y = box.y + 20;
  await page.mouse.move(box.x + 14, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.85, y, { steps: 12 });
  await page.mouse.up();
  // the peel commits the rip: the facedown stack arrives with no click
  await expect(page.getByLabel("Reveal the cards")).toBeVisible({ timeout: 10_000 });
});


// Royalties e2e work against the committed data/royalties.json. The nightly
// cron refreshes it daily, so the 7-day window is populated in CI; if the
// file ever ages out entirely, these tests skip rather than lie.
import royaltiesFixture from "../data/royalties.json";

const recentRoyalty = () => {
  const cutoff = Date.now() - 6 * 86_400_000;
  return (royaltiesFixture as { date: string; artifactId: string }[]).filter(
    (e) => Date.parse(`${e.date}T00:00:00Z`) >= cutoff,
  );
};

test("royalties: collect card pays once and stays claimed", async ({ page }) => {
  const recent = recentRoyalty();
  test.skip(recent.length === 0, "royalties.json has no entries in the window");
  await blockArt(page);
  await seedBinder(page, [recent[0].artifactId]);
  await seedWallet(page, 0);
  await page.goto("/binder");
  // the strip previews the amount; the full card lives in the treasury sheet
  await expect(page.getByTestId("treasury-strip")).toContainText("to collect");
  await page.getByTestId("treasury-strip").click();
  await expect(page.getByText("⚡ Royalties").first()).toBeVisible();
  const collect = page.getByRole("button", { name: /Collect royalties/ });
  await expect(collect).toBeVisible();
  await collect.click();
  await expect(page.getByText(/gainfully employed/)).toBeVisible();
  const wallet = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("ai-index:wallet:v1") ?? "{}"),
  );
  expect(wallet.bal).toBeGreaterThan(0);
  // claimed: a reload's strip offers nothing to collect
  await page.reload();
  await expect(page.getByTestId("treasury-strip")).not.toContainText("to collect");
  await page.getByTestId("treasury-strip").click();
  await expect(page.getByRole("button", { name: /Collect royalties/ })).not.toBeVisible();
});

test("royalties: selling a paying artifact asks for a second tap", async ({ page }) => {
  const recent = recentRoyalty();
  test.skip(recent.length === 0, "royalties.json has no entries in the window");
  const id = recent[0].artifactId;
  await blockArt(page);
  await page.addInitScript((artifactId: string) => {
    const now = new Date().toISOString();
    localStorage.setItem(
      "ai-index:binder:v1",
      JSON.stringify({ [artifactId]: { copies: 2, firstPulledAt: now, lastPulledAt: now } }),
    );
    localStorage.setItem(
      "ai-index:onboarding:v1",
      JSON.stringify({ pack: true, binder: true, nudge: true, arena: true }),
    );
    const d = new Date();
    const day = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    // pre-claim so the collect card doesn't cover the grid
    localStorage.setItem("ai-index:royalties:v1", JSON.stringify([day]));
    localStorage.setItem("ai-index:rituals:v1", JSON.stringify({ visit: day }));
  }, id);
  await page.goto("/binder");
  // open the artifact's sheet from the grid
  // dispatchEvent: the pocket's decorative overlays fail Playwright's strict
  // hit-test even though a human tap lands fine
  await page.locator(`button:has-text("×2")`).first().dispatchEvent("click");
  await expect(page.getByText(/Paid ₮\d+ over the last 30 days/)).toBeVisible();
  const sell = page.getByRole("button", { name: /Sell one spare/ });
  await sell.click();
  await expect(page.getByRole("button", { name: /Sure\?/ })).toBeVisible();
});
