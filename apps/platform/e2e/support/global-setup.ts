import { createClerkClient } from "@clerk/backend";
import { clerkSetup } from "@clerk/testing/playwright";

import {
  deleteRecordedClerkUser,
  deleteRegistryFile,
  findLeftoverRunIds,
  hasDeletionFailures,
  readCreatedEmails,
  summarizeDeletionResults,
} from "./clerk-users";
import { isPlaceholderValue, loadRepoRootEnv, requireEnv, requireRealEnv } from "./env";
import { resolveRunId } from "./run-id";

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
// guarded portal route directly (apps/platform/src/features/accounts/
// server/require-account.server.ts) — the protected-portal journey depends
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

// Best-effort cleanup of every prior run's leaked users before this run
// starts recording its own — see clerk-users.ts's registry-file comment for
// why prior runs can leave a file behind at all (an aborted run never
// reaches global-teardown.ts). A leftover file is only removed once every
// email in it has been resolved without a genuine failure, so a sweep that
// itself hits an error leaves that file for the next run to retry.
async function sweepLeftoverRegistries(currentRunId: string): Promise<void> {
  const leftoverRunIds = findLeftoverRunIds(currentRunId);

  if (leftoverRunIds.length === 0) {
    console.log("[e2e cleanup sweep] no leftover registries from prior runs.");
    return;
  }

  const clerkClient = createClerkClient({ secretKey: requireEnv("CLERK_SECRET_KEY") });

  for (const runId of leftoverRunIds) {
    const emails = readCreatedEmails(runId);
    const results = [];

    for (const email of emails) {
      results.push(await deleteRecordedClerkUser(clerkClient.users, email));
    }

    console.log(`[e2e cleanup sweep] run ${runId}: ${summarizeDeletionResults(results)}`);

    if (!hasDeletionFailures(results)) {
      deleteRegistryFile(runId);
    }
  }
}

export default async function globalSetup() {
  loadRepoRootEnv();

  requireRealEnv("CLERK_PUBLISHABLE_KEY");
  requireRealEnv("CLERK_SECRET_KEY");
  requireRealSignInUrl();
  requireWaitlistModeDisabled();

  // This run's own id — shared with fixtures.ts (the worker process) and
  // global-teardown.ts via run-id.ts's environment variable — so every
  // record this run creates lands in one file scoped to it alone. See
  // clerk-users.ts for why that's file-per-run rather than one shared file.
  const runId = resolveRunId();

  await sweepLeftoverRegistries(runId);

  await clerkSetup();
}
