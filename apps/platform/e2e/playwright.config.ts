import { resolve } from "node:path";

import { defineConfig, devices } from "@playwright/test";

import { E2E_APP_URL } from "./support/e2e-app";
import { EMAIL_CAPTURE_URL } from "./support/email-capture";
import { loadE2eEnvironment } from "./support/env";
import { e2eDirectory, repoRootDirectory } from "./support/repo-paths";
import { requireStripeTestEnvironment } from "./support/stripe-environment";

loadE2eEnvironment();
const stripeTestEnvironment = requireStripeTestEnvironment();

// Local-only suite: no CI wiring yet (see docs/CLERK.md's "E2E lane"), so
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
  outputDir: resolve(e2eDirectory, "test-results"),
  reporter: [
    [
      "html",
      {
        outputFolder: resolve(e2eDirectory, "playwright-report"),
        open: "never",
      },
    ],
  ],
  // The hosted Account Portal's bot-protection challenge can take a few
  // retries to settle (see account-portal.ts's submitUntilAdvanced) — a
  // journey that completes two or three Clerk hosted-page steps needs more
  // than Playwright's 30s default to absorb that without going flaky.
  timeout: 90_000,
  use: {
    baseURL: E2E_APP_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
  ],
  globalSetup: "./support/global-setup.ts",
  // Deletes every Clerk user this run's journeys created — see
  // support/global-teardown.ts and docs/CLERK.md's E2E lane section.
  globalTeardown: "./support/global-teardown.ts",
  webServer: {
    command: "pnpm dev:e2e",
    // The e2e tree lives under apps/platform, but `pnpm dev:e2e` is a root
    // script (it also carries the LOCAL_POSTGRES_PORT/DATABASE_PORT wiring the
    // bare `apps/platform` script doesn't) — the webServer has to run from the
    // repo root to resolve it.
    cwd: repoRootDirectory,
    url: `${E2E_APP_URL}/readyz`,
    reuseExistingServer: false,
    env: {
      IDENTITY_PROVIDER: "clerk",
      PAYMENTS_PROVIDER: "stripe",
      PRODUCT_EMAIL_PROVIDER: "resend",
      PUBLIC_APP_URL: E2E_APP_URL,
      RESEND_API_KEY: "re_e2e_email_capture",
      RESEND_BASE_URL: EMAIL_CAPTURE_URL,
      STRIPE_SECRET_KEY: stripeTestEnvironment.secretKey,
      STRIPE_WEBHOOK_SIGNING_SECRET: stripeTestEnvironment.webhookSigningSecret,
    },
    // The dev server compiles the full Vite/React Router graph on first
    // request; a generous ceiling keeps a cold start from racing the suite.
    timeout: 120_000,
  },
});
