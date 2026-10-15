import type { ClerkClient } from "@clerk/backend";

import { cleanUpRunAssessmentCalls } from "./assessment-calls";
import { releaseClerkAccounts } from "./clerk-accounts";
import { summarizeRevocations } from "./clerk-invitations";
import { cleanUpRunExercises } from "./coach-exercises";
import {
  deleteRegistryFile,
  readUnreleasedEmails,
  summarizeDeletionResults,
} from "./clerk-users";
import { cleanUpRecordedStripeObjects } from "./stripe-cleanup";

export async function cleanUpRun(
  clerkClient: ClerkClient,
  runId: string,
  logPrefix: string,
): Promise<void> {
  const release = await releaseClerkAccounts(
    clerkClient,
    readUnreleasedEmails(runId),
  );

  console.log(
    `${logPrefix} Clerk users: ${summarizeDeletionResults(release.deletions)}`,
  );
  console.log(
    `${logPrefix} Clerk invitations: ${summarizeRevocations(release.revocations)}`,
  );
  const stripe = await cleanUpRecordedStripeObjects(runId, logPrefix);
  const database = await cleanUpRunAssessmentCalls(runId, logPrefix);
  const exercises = await cleanUpRunExercises(runId, logPrefix);

  if (
    release.released &&
    stripe.allCleaned &&
    database.allCleaned &&
    exercises.allCleaned
  ) {
    deleteRegistryFile(runId);
  }
}
