import { defineConfig, devices } from "@playwright/test";

// HONEST LIMITATION: these specs have never been executed in the
// environment this project was built in — no real database connection
// (see ARCHITECTURE.md) and no network path to download Playwright's
// browser binaries (`npx playwright install`) either. They are written
// correctly against Playwright's real API and should run as-is once this
// app is deployed with a real database — but "written correctly" and
// "verified passing" are different claims, and only the first one is true
// here. Run `npx playwright install` once, then `npx playwright test`,
// against a real running instance with seed data loaded, before trusting
// these as regression coverage.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
