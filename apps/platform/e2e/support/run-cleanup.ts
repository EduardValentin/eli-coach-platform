import { statSync } from "node:fs";

import type { ClerkClient } from "@clerk/backend";

import { cleanUpRunAssessmentCalls } from "./assessment-calls";
import { releaseClerkAccounts } from "./clerk-accounts";
import { summarizeRevocations } from "./clerk-invitations";
import {
  createdEmailRegistry,
  deleteRegistryFile,
  readUnreleasedEmails,
  summarizeDeletionResults,
} from "./clerk-users";
import { cleanUpRunLibraries } from "./coach-libraries";
import type { RunRegistry } from "./run-registry";
import {
  cleanUpRunStoreProducts,
  storeProductRegistry,
} from "./store-products";
import { cleanUpRecordedStripeObjects } from "./stripe-cleanup";

type ForeignRun = { runId: string; lastWriteMs: number };

// A suite that's still running keeps appending to its own registry files
// for as long as it runs, and this suite's own runs finish in minutes (see
// playwright.config.ts) — so a foreign run whose most recent registry write
// is under two hours old is presumed to be a still-running suite, not an
// aborted one. Sweeping it anyway (cleaning up what its registries list,
// then the files themselves) would delete a concurrently running suite's
// records out from under it. Two hours is generous headroom above "minutes"
// without risking a slow CI run getting swept mid-flight.
const MIN_LEFTOVER_AGE_MS = 2 * 60 * 60 * 1000;

const SWEPT_REGISTRIES: readonly RunRegistry[] = [
  createdEmailRegistry,
  storeProductRegistry,
];

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
  const libraries = await cleanUpRunLibraries(runId, logPrefix);
  const storeProducts = await cleanUpRunStoreProducts(runId, logPrefix);

  if (
    release.released &&
    stripe.allCleaned &&
    database.allCleaned &&
    libraries.allCleaned &&
    storeProducts.allCleaned
  ) {
    deleteRegistryFile(runId);
  }
}

// Every other run with a registry file still on disk when this run starts,
// regardless of age, at its latest write across the swept registries.
// Excludes the current run (which hasn't recorded anything of its own yet,
// but shares the runtime directory). Shared by findLeftoverRunIds and
// findPossiblyActiveRunIds so the two stay a strict partition of the same
// listing rather than two independent directory scans that could drift
// apart.
function listForeignRuns(currentRunId: string): ForeignRun[] {
  const latestWrites = SWEPT_REGISTRIES.flatMap((registry) =>
    registry
      .recordedRunIds()
      .filter((runId) => runId !== currentRunId)
      .flatMap((runId) => registryWriteOf(registry, runId)),
  ).reduce(
    (latest, run) =>
      latest.set(
        run.runId,
        Math.max(latest.get(run.runId) ?? run.lastWriteMs, run.lastWriteMs),
      ),
    new Map<string, number>(),
  );

  return [...latestWrites].map(([runId, lastWriteMs]) => ({
    runId,
    lastWriteMs,
  }));
}

// A concurrent run's own cleanup can remove one of its registry files
// between the directory listing and the stat below. That race is exactly
// what this sweep exists to survive, so a file gone by the time it's stat'd
// is skipped rather than treated as a failure — it means the other run
// already finished cleaning up.
function registryWriteOf(registry: RunRegistry, runId: string): ForeignRun[] {
  try {
    return [{ runId, lastWriteMs: statSync(registry.filePath(runId)).mtimeMs }];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

// Foreign runs old enough to be safely swept — candidates for
// global-setup.ts's leftover sweep.
export function findLeftoverRunIds(currentRunId: string): string[] {
  const cutoffMs = Date.now() - MIN_LEFTOVER_AGE_MS;

  return listForeignRuns(currentRunId)
    .filter((run) => run.lastWriteMs <= cutoffMs)
    .map((run) => run.runId);
}

// Foreign runs too young to sweep — left in place because they may belong
// to a suite that's still running. Reported by global-setup.ts's sweep so a
// skip is visible rather than silent.
export function findPossiblyActiveRunIds(currentRunId: string): string[] {
  const cutoffMs = Date.now() - MIN_LEFTOVER_AGE_MS;

  return listForeignRuns(currentRunId)
    .filter((run) => run.lastWriteMs > cutoffMs)
    .map((run) => run.runId);
}
