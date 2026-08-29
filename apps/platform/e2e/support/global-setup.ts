import { clerkSetup } from "@clerk/testing/playwright";

import { resetCreatedEmailsLog } from "./clerk-users";
import { isPlaceholderValue, loadRepoRootEnv, requireRealEnv } from "./env";

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
  if (isPlaceholderValue(process.env.CLERK_SIGN_IN_URL)) {
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
  loadRepoRootEnv();

  requireRealEnv("CLERK_PUBLISHABLE_KEY");
  requireRealEnv("CLERK_SECRET_KEY");
  requireRealSignInUrl();
  requireWaitlistModeDisabled();

  // Fresh state for this run's Clerk-user cleanup registry — see
  // clerk-users.ts and global-teardown.ts.
  resetCreatedEmailsLog();

  await clerkSetup();
}
