import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";

import { e2eDirectory } from "./repo-paths";

// Every Clerk Development-instance user this suite creates has to be deleted
// again — the instance carries a hard 100-user cap, and letting
// `+clerk_test` users accumulate here already caused an outage (see
// docs/CLERK.md's E2E lane section). Each test records its generated email
// here as soon as it's minted (see fixtures.ts's testEmail fixture);
// global-teardown.ts reads its own run's file back at the end of the run and
// deletes every user it resolves to via the Clerk Backend API.
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
// sweeps every leftover file it finds from prior runs before this run
// starts recording its own.
const runtimeDirectory = resolve(e2eDirectory, ".runtime");
const registryFilePrefix = "created-emails-";
const registryFileSuffix = ".log";

function registryFilePath(runId: string): string {
  return resolve(runtimeDirectory, `${registryFilePrefix}${runId}${registryFileSuffix}`);
}

// Single worker, sequential tests (see playwright.config.ts) — a plain
// synchronous append needs no cross-process locking.
export function recordCreatedEmail(email: string, runId: string): void {
  mkdirSync(runtimeDirectory, { recursive: true });
  appendFileSync(registryFilePath(runId), `${email}\n`);
}

export function readCreatedEmails(runId: string): string[] {
  const path = registryFilePath(runId);

  if (!existsSync(path)) {
    return [];
  }

  return readFileSync(path, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

// Deletes this run's own registry file — called once a run's users have all
// been accounted for (see global-teardown.ts and global-setup.ts's sweep),
// never unconditionally, so a run that leaves genuine deletion failures
// behind keeps its file around for the next sweep to retry.
export function deleteRegistryFile(runId: string): void {
  const path = registryFilePath(runId);

  if (existsSync(path)) {
    rmSync(path);
  }
}

// Every other run's registry file still on disk when this run starts —
// candidates for global-setup.ts's leftover sweep. Excludes the current run
// (which hasn't recorded anything of its own yet, but shares the runtime
// directory).
export function findLeftoverRunIds(currentRunId: string): string[] {
  if (!existsSync(runtimeDirectory)) {
    return [];
  }

  return readdirSync(runtimeDirectory)
    .filter((name) => name.startsWith(registryFilePrefix) && name.endsWith(registryFileSuffix))
    .map((name) => name.slice(registryFilePrefix.length, -registryFileSuffix.length))
    .filter((runId) => runId !== currentRunId);
}

// The suite's own test-email convention (fixtures.ts's nextTestEmail) is the
// second half of the double guard before deleting anything: a recorded
// address is only actionable if it also carries this Clerk test-email
// subaddress, so a bug that recorded the wrong string can't reach a real
// account.
export function isClerkTestEmail(email: string): boolean {
  const [localPart] = email.split("@");
  return (localPart ?? "").endsWith("+clerk_test");
}

// The narrow slice of the Clerk Backend client this module actually needs —
// letting global-setup.ts's sweep and global-teardown.ts's own-run cleanup
// share one deletion routine without either depending on the full
// `ClerkClient` type, and letting a test stub this out with a fake instead
// of a real Backend client.
export type ClerkUsersApi = {
  getUserList(params: { emailAddress: string[] }): Promise<{ data: Array<{ id: string }> }>;
  deleteUser(userId: string): Promise<unknown>;
};

export type EmailDeletionOutcome = "deleted" | "not-found" | "skipped" | "failed";

export type EmailDeletionResult = {
  email: string;
  outcome: EmailDeletionOutcome;
  reason?: string;
};

// Shared by global-teardown.ts (this run's own users) and global-setup.ts's
// leftover sweep (prior runs' users) — the exact-match + `+clerk_test`
// double guard has to be identical at both call sites, or a bug fixed in one
// place could silently reappear in the other. Deletion failures are
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
      // The journey that generated this email never completed a real
      // sign-up (e.g. it failed before reaching Clerk) — nothing to delete.
      return { email, outcome: "not-found" };
    }

    await usersApi.deleteUser(user.id);
    return { email, outcome: "deleted" };
  } catch (error) {
    return { email, outcome: "failed", reason: error instanceof Error ? error.message : String(error) };
  }
}

// A "skipped" entry (an address that doesn't carry the +clerk_test
// convention) is a data-integrity oddity worth investigating, but retrying
// it will never resolve it — only a genuine "failed" outcome (a real error
// talking to Clerk) is worth keeping the registry file around for.
export function hasDeletionFailures(results: EmailDeletionResult[]): boolean {
  return results.some((result) => result.outcome === "failed");
}

export function summarizeDeletionResults(results: EmailDeletionResult[]): string {
  const deleted = results.filter((result) => result.outcome === "deleted").length;
  const notFound = results.filter((result) => result.outcome === "not-found").length;
  const skipped = results.filter((result) => result.outcome === "skipped");
  const failed = results.filter((result) => result.outcome === "failed");

  const parts = [`${results.length} recorded`, `${deleted} deleted`];

  if (notFound > 0) {
    parts.push(`${notFound} already gone`);
  }

  if (skipped.length > 0) {
    parts.push(`${skipped.length} skipped: ${skipped.map((result) => result.email).join("; ")}`);
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
