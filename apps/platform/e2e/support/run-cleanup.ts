import type { ClerkClient } from "@clerk/backend";

import { cleanUpRunAssessmentCalls } from "./assessment-calls";
import {
  revokePendingInvitations,
  summarizeRevocations,
} from "./clerk-invitations";
import {
  deleteRecordedClerkUser,
  deleteRegistryFile,
  hasDeletionFailures,
  readCreatedEmails,
  summarizeDeletionResults,
} from "./clerk-users";
import { cleanUpRecordedCheckoutSessions } from "./stripe-cleanup";

export async function cleanUpRun(
  clerkClient: ClerkClient,
  runId: string,
  logPrefix: string,
): Promise<void> {
  const emails = readCreatedEmails(runId);
  const deletions = [];

  for (const email of emails) {
    deletions.push(await deleteRecordedClerkUser(clerkClient.users, email));
  }

  const revocations = await revokePendingInvitations(
    clerkClient.invitations,
    emails,
  );

  console.log(
    `${logPrefix} Clerk users: ${summarizeDeletionResults(deletions)}`,
  );
  console.log(
    `${logPrefix} Clerk invitations: ${summarizeRevocations(revocations)}`,
  );
  const stripe = await cleanUpRecordedCheckoutSessions(runId, logPrefix);
  const database = await cleanUpRunAssessmentCalls(runId, logPrefix);

  if (
    !hasDeletionFailures(deletions) &&
    revocations.failed.length === 0 &&
    stripe.allCleaned &&
    database.allCleaned
  ) {
    deleteRegistryFile(runId);
  }
}
