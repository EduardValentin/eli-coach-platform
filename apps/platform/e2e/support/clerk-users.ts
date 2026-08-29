import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { e2eDirectory } from "./repo-paths";

// Every Clerk Development-instance user this suite creates has to be deleted
// again at the end of the run — the instance carries a hard 100-user cap,
// and letting `+clerk_test` users accumulate here already caused an outage
// (see docs/CLERK.md's E2E lane section). Each test records its generated
// email here as soon as it's minted (see fixtures.ts's testEmail fixture);
// global-teardown.ts reads the file back and deletes every user it resolves
// to via the Clerk Backend API.
//
// File-based rather than an in-memory registry: Playwright runs
// globalSetup/globalTeardown in the runner process, separate from the
// worker process(es) that actually mint emails and drive the browser, so
// nothing in-memory here would survive to teardown.
const createdEmailsLogPath = resolve(e2eDirectory, ".runtime/created-emails.log");

// Clears the previous run's leftovers before this run's tests start
// recording — called once from global-setup.ts.
export function resetCreatedEmailsLog(): void {
  mkdirSync(dirname(createdEmailsLogPath), { recursive: true });
  writeFileSync(createdEmailsLogPath, "");
}

// Single worker, sequential tests (see playwright.config.ts) — a plain
// synchronous append needs no cross-process locking.
export function recordCreatedEmail(email: string): void {
  mkdirSync(dirname(createdEmailsLogPath), { recursive: true });
  appendFileSync(createdEmailsLogPath, `${email}\n`);
}

export function readCreatedEmails(): string[] {
  if (!existsSync(createdEmailsLogPath)) {
    return [];
  }

  return readFileSync(createdEmailsLogPath, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

// The suite's own test-email convention (fixtures.ts's nextTestEmail) is the
// second half of global-teardown.ts's double guard before deleting anything:
// a recorded address is only actionable if it also carries this Clerk
// test-email subaddress, so a bug that recorded the wrong string can't reach
// a real account.
export function isClerkTestEmail(email: string): boolean {
  const [localPart] = email.split("@");
  return (localPart ?? "").endsWith("+clerk_test");
}
