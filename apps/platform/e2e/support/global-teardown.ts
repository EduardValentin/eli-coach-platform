import { createClerkClient } from "@clerk/backend";

import { isClerkTestEmail, readCreatedEmails } from "./clerk-users";
import { loadRepoRootEnv, requireEnv } from "./env";

// Counterpart to global-setup.ts: every Clerk Development-instance user a
// journey created this run gets deleted here, so the shared instance's
// hard 100-user cap never creeps back toward the outage that motivated this
// file (see docs/CLERK.md's E2E lane section). A deletion failure is
// reported, never thrown — a cleanup problem shouldn't flip an otherwise-
// green run red, and there is no meaningful retry target from inside a
// teardown hook.
export default async function globalTeardown() {
  loadRepoRootEnv();

  const emails = readCreatedEmails();

  if (emails.length === 0) {
    console.log("[e2e cleanup] 0 users created, nothing to delete.");
    return;
  }

  const clerkClient = createClerkClient({ secretKey: requireEnv("CLERK_SECRET_KEY") });

  let deleted = 0;
  const failures: string[] = [];

  for (const email of emails) {
    // Double guard: only ever act on an address that both came out of this
    // run's own recorded log AND still carries the +clerk_test convention —
    // see isClerkTestEmail's comment.
    if (!isClerkTestEmail(email)) {
      failures.push(`${email} (does not match the +clerk_test convention, skipped)`);
      continue;
    }

    try {
      const matchingUsers = await clerkClient.users.getUserList({ emailAddress: [email] });
      const user = matchingUsers.data[0];

      if (!user) {
        // The journey that generated this email never completed a real
        // sign-up (e.g. it failed before reaching Clerk) — nothing to delete.
        continue;
      }

      await clerkClient.users.deleteUser(user.id);
      deleted += 1;
    } catch (error) {
      failures.push(`${email} (${error instanceof Error ? error.message : String(error)})`);
    }
  }

  const failureSuffix = failures.length > 0 ? `, ${failures.length} failed: ${failures.join("; ")}` : "";
  console.log(`[e2e cleanup] ${emails.length} created, ${deleted} deleted${failureSuffix}`);
}
