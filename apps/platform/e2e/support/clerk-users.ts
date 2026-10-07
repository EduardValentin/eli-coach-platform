import { statSync } from "node:fs";

import { runRegistry } from "./run-registry";

// Every Clerk Development-instance user this suite creates has to be deleted
// again — the instance carries a hard 100-user cap, and letting
// `+clerk_test` users accumulate here already caused an outage (see
// docs/CLERK.md's E2E lane section). Each test records its generated email
// here as soon as it's minted (see fixtures.ts's testEmail fixture);
// run-cleanup.ts's cleanUpRun reads the run's file back at the end of the run
// and deletes every user it resolves to via the Clerk Backend API.
//
// File-based rather than an in-memory registry: Playwright runs
// globalSetup/globalTeardown in the runner process, separate from the
// worker process that actually mints emails and drives the browser, so
// nothing in-memory here would survive to teardown.
//
// One file per run (named after run-id.ts's run id) rather than one shared
// file: an aborted run (Ctrl-C, a hang, a kill) never reaches teardown, and
// a single shared file truncated at the *next* run's setup would erase the
// only record of whatever that aborted run leaked — permanently. Two
// concurrent runs would also stomp each other's file. Splitting the
// registry per run turns that into a recoverable problem: global-setup.ts
// sweeps (through cleanUpRun) every leftover file it finds from prior runs before this run
// starts recording its own.
const createdEmails = runRegistry("created-emails-");

// The addresses whose users and invitations a journey already removed as it
// ended, so teardown looks up only what a crashed journey left behind.
const releasedEmails = runRegistry("released-emails-");

export function registryFileName(runId: string): string {
  return createdEmails.fileName(runId);
}

// Single worker, sequential tests (see playwright.config.ts) — a plain
// synchronous append needs no cross-process locking.
export function recordCreatedEmail(email: string, runId: string): void {
  createdEmails.record(email, runId);
}

export function readCreatedEmails(runId: string): string[] {
  return createdEmails.read(runId);
}

export function recordReleasedEmails(
  emails: readonly string[],
  runId: string,
): void {
  for (const email of emails) {
    releasedEmails.record(email, runId);
  }
}

export function readUnreleasedEmails(runId: string): string[] {
  const released = new Set(releasedEmails.read(runId));

  return createdEmails.read(runId).filter((email) => !released.has(email));
}

// Deletes this run's own registry file — called once a run's users have all
// been accounted for (see run-cleanup.ts's cleanUpRun),
// never unconditionally, so a run that leaves genuine deletion failures
// behind keeps its file around for the next sweep to retry.
export function deleteRegistryFile(runId: string): void {
  createdEmails.remove(runId);
  releasedEmails.remove(runId);
}

// A suite that's still running keeps appending to its own registry file
// (recordCreatedEmail, above) for as long as it runs, and this suite's own
// runs finish in minutes (see playwright.config.ts) — so a foreign file
// whose most recent write is under two hours old is presumed to belong to a
// still-running suite, not an aborted one. Sweeping it anyway (deleting the
// Clerk users it lists, then the file itself) would delete a concurrently
// running suite's users out from under it. Two hours is generous headroom
// above "minutes" without risking a slow CI run getting swept mid-flight.
const MIN_LEFTOVER_AGE_MS = 2 * 60 * 60 * 1000;

type ForeignRegistryFile = { runId: string; mtimeMs: number };

// Every other run's registry file still on disk when this run starts,
// regardless of age. Excludes the current run (which hasn't recorded
// anything of its own yet, but shares the runtime directory). Shared by
// findLeftoverRunIds and findPossiblyActiveRunIds so the two stay a strict
// partition of the same listing rather than two independent directory scans
// that could drift apart.
function listForeignRegistryFiles(currentRunId: string): ForeignRegistryFile[] {
  return (
    createdEmails
      .recordedRunIds()
      .filter((runId) => runId !== currentRunId)
      // A concurrent run's own deleteRegistryFile (called once its users are
      // all accounted for) can remove a file between this readdir and the stat
      // below. That race is exactly what this sweep exists to survive, so a
      // file gone by the time it's stat'd is skipped rather than treated as a
      // failure — it means the other run already finished cleaning up.
      .flatMap((runId) => {
        try {
          return [
            { runId, mtimeMs: statSync(createdEmails.filePath(runId)).mtimeMs },
          ];
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            return [];
          }

          throw error;
        }
      })
  );
}

// Foreign registry files old enough to be safely swept — candidates for
// global-setup.ts's leftover sweep.
export function findLeftoverRunIds(currentRunId: string): string[] {
  const cutoffMs = Date.now() - MIN_LEFTOVER_AGE_MS;

  return listForeignRegistryFiles(currentRunId)
    .filter((file) => file.mtimeMs <= cutoffMs)
    .map((file) => file.runId);
}

// Foreign registry files too young to sweep — left in place because they
// may belong to a suite that's still running. Reported by global-setup.ts's
// sweep so a skip is visible rather than silent.
export function findPossiblyActiveRunIds(currentRunId: string): string[] {
  const cutoffMs = Date.now() - MIN_LEFTOVER_AGE_MS;

  return listForeignRegistryFiles(currentRunId)
    .filter((file) => file.mtimeMs > cutoffMs)
    .map((file) => file.runId);
}

// The suite's own test-email convention (fixtures.ts's mintRecordedTestEmail) is the
// second half of the double guard before deleting anything: a recorded
// address is only actionable if it also carries this Clerk test-email
// subaddress, so a bug that recorded the wrong string can't reach a real
// account.
export function isClerkTestEmail(email: string): boolean {
  const [localPart] = email.split("@");
  return (localPart ?? "").endsWith("+clerk_test");
}

// The narrow slice of the Clerk Backend client this module actually needs —
// letting run-cleanup.ts's cleanUpRun use one deletion routine without
// depending on the full `ClerkClient` type, and letting a test stub this out with a fake instead
// of a real Backend client.
export type ClerkUsersApi = {
  getUserList(params: {
    emailAddress: string[];
  }): Promise<{ data: Array<{ id: string }> }>;
  deleteUser(userId: string): Promise<unknown>;
};

export type EmailDeletionOutcome =
  "deleted" | "not-found" | "skipped" | "failed";

export type EmailDeletionResult = {
  email: string;
  outcome: EmailDeletionOutcome;
  reason?: string;
};

// Called by run-cleanup.ts's cleanUpRun for this run's own users (teardown)
// and for prior runs' users (the setup sweep), so the exact-match +
// `+clerk_test` double guard is the same for both. Deletion failures are
// reported, never thrown: a cleanup problem shouldn't flip an otherwise-
// green run red, and there's no meaningful retry target from inside a
// teardown or setup hook — see deleteRegistryFile's callers for the actual
// retry mechanism (leaving the file in place).
export async function deleteRecordedClerkUser(
  usersApi: ClerkUsersApi,
  email: string,
): Promise<EmailDeletionResult> {
  if (!isClerkTestEmail(email)) {
    return { email, outcome: "skipped" };
  }

  try {
    const matchingUsers = await usersApi.getUserList({ emailAddress: [email] });
    const user = matchingUsers.data[0];

    if (!user) {
      // The journey that generated this email never created its Clerk user
      // (e.g. it failed before reaching the Backend API) — nothing to delete.
      return { email, outcome: "not-found" };
    }

    await usersApi.deleteUser(user.id);
    return { email, outcome: "deleted" };
  } catch (error) {
    return {
      email,
      outcome: "failed",
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function deleteRecordedClerkUsers(
  usersApi: ClerkUsersApi,
  emails: readonly string[],
): Promise<EmailDeletionResult[]> {
  const results: EmailDeletionResult[] = [];

  for (const email of emails) {
    results.push(await deleteRecordedClerkUser(usersApi, email));
  }

  return results;
}

// A "skipped" entry (an address that doesn't carry the +clerk_test
// convention) is a data-integrity oddity worth investigating, but retrying
// it will never resolve it — only a genuine "failed" outcome (a real error
// talking to Clerk) is worth keeping the registry file around for.
export function hasDeletionFailures(results: EmailDeletionResult[]): boolean {
  return results.some((result) => result.outcome === "failed");
}

export function summarizeDeletionResults(
  results: EmailDeletionResult[],
): string {
  const deleted = results.filter(
    (result) => result.outcome === "deleted",
  ).length;
  const notFound = results.filter(
    (result) => result.outcome === "not-found",
  ).length;
  const skipped = results.filter((result) => result.outcome === "skipped");
  const failed = results.filter((result) => result.outcome === "failed");

  const parts = [`${results.length} recorded`, `${deleted} deleted`];

  if (notFound > 0) {
    parts.push(`${notFound} already gone`);
  }

  if (skipped.length > 0) {
    parts.push(
      `${skipped.length} skipped: ${skipped.map((result) => result.email).join("; ")}`,
    );
  }

  if (failed.length > 0) {
    parts.push(
      `${failed.length} failed: ${failed
        .map((result) => `${result.email} (${result.reason})`)
        .join("; ")}`,
    );
  }

  return parts.join(", ");
}
