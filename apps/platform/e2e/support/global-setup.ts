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

// PublicLayout renders no auth controls at all while the waitlist is on
// (authControlsEnabled = !waitlist.enabled, and waitlist.enabled is read
// straight from this env var at process boot) — every journey here starts
// by clicking "Sign In" or asserting a signed-out/signed-in nav state, none
// of which exists in that mode. This isn't a test-only concern: a human
// clicking through the app locally hits the same dead end, so it's worth
// failing loudly here rather than have every journey time out looking for a
// button that was never going to render.
function requireWaitlistModeDisabled(): void {
  const value = process.env.WAITLIST_MODE;

  if (value === "true") {
    throw new Error(
      'WAITLIST_MODE is "true" in the repo root .env. Waitlist mode hides ' +
        "every auth control (Sign In/Out, the Client/Coach Portal pills) " +
        "from the public nav, so none of this suite's journeys can run. Set " +
        "it to \"false\" locally before running the Playwright suite.",
    );
  }
}

// requirePortalAccess redirects an anonymous visitor here when they hit a
// guarded portal route directly (apps/platform/src/features/accounts/ui/
// shared/require-account.server.ts) — the protected-portal journey depends
// on that redirect actually landing on Clerk's hosted Account Portal rather
// than 404ing on an app route that doesn't exist. A placeholder value 404s
// silently until a test times out waiting for the hosted sign-in form.
function requireRealSignInUrl(): void {
  const value = process.env.CLERK_SIGN_IN_URL;

  if (value === undefined || PLACEHOLDER_VALUES.has(value)) {
    throw new Error(
      "CLERK_SIGN_IN_URL is missing or still a placeholder in the repo root " +
        ".env. Set it to this Clerk Development instance's real hosted " +
        "Account Portal sign-in URL (e.g. https://<your-instance-slug>" +
        ".accounts.dev/sign-in — findable via that instance's Frontend API " +
        "/v1/environment response, display_config.sign_in_url). The " +
        "protected-portal journey's redirect target comes straight from " +
        "this variable, and a placeholder sends it to a 404 instead.",
    );
  }
}

export default async function globalSetup() {
  // The app's own dev server loads `.env` via `node --env-file`; this process
  // is a plain `node`/Playwright run with no such flag, so the repo root file
  // has to be loaded explicitly to see the same Clerk keys.
  process.loadEnvFile(repoRootEnvPath);

  requireRealClerkEnvironmentVariable("CLERK_PUBLISHABLE_KEY");
  requireRealClerkEnvironmentVariable("CLERK_SECRET_KEY");
  requireRealSignInUrl();
  requireWaitlistModeDisabled();

  await clerkSetup();
}
