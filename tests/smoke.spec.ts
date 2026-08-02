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

// openai is legendary → never the weekly spotlight → reliably facedown
// for a fresh profile. Do not switch this to a common card.
const FACEDOWN_CARD = "/cards/openai";

function watchErrors(page: Page): { errors: string[]; notFound: string[] } {
  const errors: string[] = [];
  const notFound: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
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
      const watch = watchErrors(page);
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      expect(watch.errors, `console errors on ${path}`).toEqual([]);
      expect(watch.notFound, `404s on ${path}`).toEqual([]);
    });
  }
});

test("rip flow: packs → auto-flip → binder, and it persists", async ({ page }) => {
  const watch = watchErrors(page);
  await page.goto("/packs");
  await page.getByLabel("Rip the pack").click();
  await page.waitForURL("**/binder", { timeout: 20_000 });
  const binder = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("ai-index:binder:v1") ?? "{}"),
  );
  expect(Object.keys(binder).length).toBeGreaterThan(0);
  // persistence across reload
  await page.reload();
  const after = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("ai-index:binder:v1") ?? "{}"),
  );
  expect(Object.keys(after)).toEqual(Object.keys(binder));
  expect(watch.errors).toEqual([]);
});

test("gallery deck: mobile default, next advances the stack", async ({ page }) => {
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

test("peek: press-and-hold flips and stamps PEEKED", async ({ page }) => {
  await page.goto(FACEDOWN_CARD);
  await expect(page.getByText("press & hold to peek")).toBeVisible();
  const back = page.getByTestId("peekable").first();
  const box = (await back.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(900); // hold past the 600ms threshold
  await page.mouse.up();
  const peeked = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("ai-index:peeked:v1") ?? '{"ids":[]}'),
  );
  expect(peeked.ids).toContain("openai");
  await expect(page.getByText("Peeked", { exact: false }).first()).toBeVisible();
});

test("mystery: share-ref reveals, direct nav stays facedown", async ({ page }) => {
  await page.goto(`${FACEDOWN_CARD}?ref=share`);
  await expect(page.getByText("Revealed by a collector")).toBeVisible();
  // direct navigation in a fresh state stays facedown
  await page.goto(FACEDOWN_CARD);
  await expect(page.getByText("Unpulled — rip packs to reveal")).toBeVisible();
  await expect(page.getByText("Revealed by a collector")).not.toBeVisible();
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

test("about + how it works render", async ({ page }) => {
  await page.goto("/howto");
  await expect(page.getByRole("heading", { name: "How it works" })).toBeVisible();
  await page.goto("/about");
  await expect(page.getByRole("heading", { name: "About" })).toBeVisible();
});
