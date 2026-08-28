import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import { clerkSetup } from "@clerk/testing/playwright";

const currentDirectory = fileURLToPath(new URL(".", import.meta.url));
const repoRootEnvPath = resolve(currentDirectory, "../../../../.env");

const PLACEHOLDER_VALUES = new Set(["replace-me", ""]);

// This suite drives Clerk's real Development-instance hosted pages — there is
// no mock or fixture instance to fall back to — so a placeholder key has to
// fail loudly here rather than surface as an opaque Clerk Backend API error
// once a test is already mid-journey.
function requireRealClerkEnvironmentVariable(name: string): string {
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

export default async function globalSetup() {
  // The app's own dev server loads `.env` via `node --env-file`; this process
  // is a plain `node`/Playwright run with no such flag, so the repo root file
  // has to be loaded explicitly to see the same Clerk keys.
  process.loadEnvFile(repoRootEnvPath);

  requireRealClerkEnvironmentVariable("CLERK_PUBLISHABLE_KEY");
  requireRealClerkEnvironmentVariable("CLERK_SECRET_KEY");

  await clerkSetup();
}
