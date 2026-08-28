import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { defineConfig, devices } from "@playwright/test";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
// The e2e tree lives under apps/platform, but `pnpm dev:platform` is a root
// script (it also carries the LOCAL_POSTGRES_PORT/DATABASE_PORT wiring the
// bare `apps/platform` "dev" script doesn't) — the webServer has to run from
// the repo root to resolve it.
const repoRoot = resolve(currentDirectory, "../../..");

// Local-only suite: no CI wiring yet (see Task 13's docs note for why), so
// there is no CI-vs-local branching here the way a shipped Playwright config
// usually has.
export default defineConfig({
  testDir: "./journeys",
  // Every journey drives Clerk's real hosted Account Portal. Running them
  // concurrently means several browsers hit the same Clerk dev instance (and
  // the same local dev server) from the same machine at once, which read as
  // more bot-like to Clerk's bot-protection challenge than one visitor at a
  // time — sequential execution is what kept this suite deterministic.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  // Playwright resolves relative output paths against the process cwd, not
  // the config file's own directory — pinned explicitly so artifacts always
  // land under e2e/ regardless of where `test:e2e` is invoked from.
  outputDir: resolve(currentDirectory, "test-results"),
  reporter: [["html", { outputFolder: resolve(currentDirectory, "playwright-report"), open: "never" }]],
  // The hosted Account Portal's bot-protection challenge can take a few
  // retries to settle (see account-portal.ts's submitUntilAdvanced) — a
  // journey that completes two or three Clerk hosted-page steps needs more
  // than Playwright's 30s default to absorb that without going flaky.
  timeout: 90_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
  ],
  globalSetup: "./support/global-setup.ts",
  webServer: {
    command: "pnpm dev:platform",
    cwd: repoRoot,
    url: "http://localhost:3000/readyz",
    reuseExistingServer: true,
    // The dev server compiles the full Vite/React Router graph on first
    // request; a generous ceiling keeps a cold start from racing the suite.
    timeout: 120_000,
  },
});
