import { existsSync } from "node:fs";

import { repoRootE2eEnvPath, repoRootEnvPath } from "./repo-paths";

const PLACEHOLDER_VALUES = new Set(["replace-me", ""]);

export const MISSING_E2E_ENVIRONMENT_FILE =
  "The repo root .env.e2e is missing. Copy .env.e2e.example to .env.e2e " +
  "and fill in the Stripe test-mode keys the e2e suite pays with.";

export function hasE2eEnvironmentFile(): boolean {
  return existsSync(repoRootE2eEnvPath);
}

// process.loadEnvFile never overwrites a variable that is already set, so the
// e2e-only file loads first to take precedence over the shared one.
export function loadE2eEnvironment(): void {
  if (!hasE2eEnvironmentFile()) {
    throw new Error(MISSING_E2E_ENVIRONMENT_FILE);
  }

  process.loadEnvFile(repoRootE2eEnvPath);
  process.loadEnvFile(repoRootEnvPath);
}

// A variable that simply has to be set for the suite to make sense of
// itself — worker-local arrangement (DATABASE_*, CLERK_SECRET_KEY for the
// Backend client), not a value driving real Clerk hosted-page behavior.
export function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `${name} is required for the Playwright e2e suite. Run it through ` +
        "the platform's test:e2e script so the repo root .env and .env.e2e " +
        "are loaded first.",
    );
  }

  return value;
}

// This suite drives Clerk's real Development-instance hosted pages — there is
// no mock or fixture instance to fall back to — so a placeholder key has to
// fail loudly here rather than surface as an opaque Clerk Backend API error
// once a test is already mid-journey.
export function requireRealEnv(name: string): string {
  const value = process.env[name];

  if (value === undefined || PLACEHOLDER_VALUES.has(value)) {
    throw new Error(
      `${name} is missing or still a placeholder in the repo root .env. ` +
        "The Playwright suite needs the real Clerk Development-instance keys " +
        "to drive the hosted Account Portal — see AGENTS.md's local setup steps.",
    );
  }

  return value;
}

export function isPlaceholderValue(value: string | undefined): boolean {
  return value === undefined || PLACEHOLDER_VALUES.has(value);
}
