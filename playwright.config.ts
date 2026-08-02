import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke suite. Mobile-first: the primary project is an iPhone-ish 390×844
 * viewport, matching how most collectors browse. Runs against the production
 * build (`pnpm build` first) — the dev server's overlay would pollute the
 * zero-console-error assertions.
 */
export default defineConfig({
  testDir: "./tests",
  timeout: 45_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3123",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "mobile",
      use: {
        // Chromium-based mobile profile (WebKit isn't installed in CI)
        ...devices["Pixel 7"],
        viewport: { width: 390, height: 844 },
      },
    },
  ],
  webServer: {
    command: "pnpm start -p 3123",
    port: 3123,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
