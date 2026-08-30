import { repoRootEnvPath } from "./repo-paths";

const PLACEHOLDER_VALUES = new Set(["replace-me", ""]);

// The app's own dev server loads `.env` via `node --env-file`; every process
// in this suite (fixtures' worker process, global-setup.ts, global-
// teardown.ts) is a plain node/Playwright run with no such flag, so the repo
// root file has to be loaded explicitly to see the same Clerk keys.
export function loadRepoRootEnv(): void {
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
        "the platform's test:e2e script so global-setup.ts has loaded the " +
        "repo root .env first.",
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
