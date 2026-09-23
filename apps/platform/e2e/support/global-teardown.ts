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

export default async function globalTeardown() {
  loadRepoRootEnv();

  await cleanUpClerkUsers();
}

async function cleanUpClerkUsers(): Promise<void> {
  const runId = resolveRunId();
  const emails = readCreatedEmails(runId);

  if (emails.length === 0) {
    console.log("[e2e cleanup] 0 users recorded, nothing to delete.");
    return;
  }

  const clerkClient = createClerkClient({
    secretKey: requireEnv("CLERK_SECRET_KEY"),
  });
  const results = [];

  for (const email of emails) {
    results.push(await deleteRecordedClerkUser(clerkClient.users, email));
  }

  console.log(`[e2e cleanup] ${summarizeDeletionResults(results)}`);

  if (!hasDeletionFailures(results)) {
    deleteRegistryFile(runId);
  }
}
