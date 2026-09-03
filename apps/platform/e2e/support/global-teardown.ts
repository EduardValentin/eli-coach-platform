import { createClerkClient } from "@clerk/backend";

import {
  deleteRecordedClerkUser,
  deleteRegistryFile,
  hasDeletionFailures,
  readCreatedEmails,
  summarizeDeletionResults,
} from "./clerk-users";
import { loadRepoRootEnv, requireEnv } from "./env";
import { resolveRunId } from "./run-id";
import { stopWebhookRelay } from "./webhook-relay";

// Counterpart to global-setup.ts: every Clerk Development-instance user this
// run's journeys created gets deleted here, so the shared instance's hard
// 100-user cap never creeps back toward the outage that motivated this file
// (see docs/CLERK.md's E2E lane section). A deletion failure is reported,
// never thrown — a cleanup problem shouldn't flip an otherwise-green run
// red, and there is no meaningful retry target from inside a teardown hook;
// instead this run's registry file is left in place so the next run's
// global-setup.ts sweep can retry it.
export default async function globalTeardown() {
  // First, and outside the Clerk cleanup below: the listener holds this
  // instance's relay inbox, and leaving it running would keep forwarding
  // deliveries — including the ones that cleanup is about to cause — into a
  // dev server the next run expects to start clean.
  stopWebhookRelay();

  loadRepoRootEnv();

  const runId = resolveRunId();
  const emails = readCreatedEmails(runId);

  if (emails.length === 0) {
    console.log("[e2e cleanup] 0 users recorded, nothing to delete.");
    return;
  }

  const clerkClient = createClerkClient({ secretKey: requireEnv("CLERK_SECRET_KEY") });

  const results = [];

  for (const email of emails) {
    results.push(await deleteRecordedClerkUser(clerkClient.users, email));
  }

  console.log(`[e2e cleanup] ${summarizeDeletionResults(results)}`);

  if (!hasDeletionFailures(results)) {
    deleteRegistryFile(runId);
  }
}
