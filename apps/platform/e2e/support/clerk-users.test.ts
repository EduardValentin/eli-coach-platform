import { existsSync, rmSync, utimesSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { e2eDirectory } from "./repo-paths";
import {
  deleteRecordedClerkUser,
  deleteRegistryFile,
  findLeftoverRunIds,
  findPossiblyActiveRunIds,
  hasDeletionFailures,
  readCreatedEmails,
  recordCreatedEmail,
  summarizeDeletionResults,
  type ClerkUsersApi,
} from "./clerk-users";

const runtimeDirectory = resolve(e2eDirectory, ".runtime");
// Mirrors clerk-users.ts's own MIN_LEFTOVER_AGE_MS. Not imported, because
// that constant is deliberately unexported — the guard's threshold is an
// implementation detail, and a test importing it could no longer tell "the
// guard uses the wrong constant" from "the guard used the right constant
// wrong."
const MIN_LEFTOVER_AGE_MS = 2 * 60 * 60 * 1000;

function uniqueRunId(label: string): string {
  return `test-${label}-${Date.now().toString(36)}-${Math.floor(Math.random() * 46_656).toString(36)}`;
}

function registryPathFor(runId: string): string {
  return resolve(runtimeDirectory, `created-emails-${runId}.log`);
}

// recordCreatedEmail always writes with the real current mtime, so a
// scenario proving the age guard has to backdate a file after writing it.
function backdateRegistryFile(runId: string, ageMs: number): void {
  const path = registryPathFor(runId);
  const timestamp = new Date(Date.now() - ageMs);
  utimesSync(path, timestamp, timestamp);
}

describe("clerk-users registry", () => {
  const createdRunIds: string[] = [];

  afterEach(() => {
    for (const runId of createdRunIds.splice(0)) {
      const path = registryPathFor(runId);
      if (existsSync(path)) {
        rmSync(path);
      }
    }
  });

  it("records and reads back only this run's own emails", () => {
    // arrange
    const runIdA = uniqueRunId("a");
    const runIdB = uniqueRunId("b");
    createdRunIds.push(runIdA, runIdB);

    // act
    recordCreatedEmail("a-1+clerk_test@evoa.fit", runIdA);
    recordCreatedEmail("a-2+clerk_test@evoa.fit", runIdA);
    recordCreatedEmail("b-1+clerk_test@evoa.fit", runIdB);

    // assert
    expect(readCreatedEmails(runIdA)).toEqual([
      "a-1+clerk_test@evoa.fit",
      "a-2+clerk_test@evoa.fit",
    ]);
    expect(readCreatedEmails(runIdB)).toEqual(["b-1+clerk_test@evoa.fit"]);
  });

  it("finds other runs' leftover registry files old enough to sweep, but excludes the current run", () => {
    // arrange
    const currentRunId = uniqueRunId("current");
    const leftoverRunId = uniqueRunId("leftover");
    createdRunIds.push(currentRunId, leftoverRunId);
    recordCreatedEmail("current+clerk_test@evoa.fit", currentRunId);
    recordCreatedEmail("leftover+clerk_test@evoa.fit", leftoverRunId);
    backdateRegistryFile(leftoverRunId, MIN_LEFTOVER_AGE_MS + 60_000);

    // act
    const leftovers = findLeftoverRunIds(currentRunId);

    // assert
    expect(leftovers).toContain(leftoverRunId);
    expect(leftovers).not.toContain(currentRunId);
  });

  it("excludes a foreign registry file younger than the age guard from the sweep", () => {
    // arrange
    const currentRunId = uniqueRunId("current");
    const activeRunId = uniqueRunId("active");
    createdRunIds.push(currentRunId, activeRunId);
    recordCreatedEmail("current+clerk_test@evoa.fit", currentRunId);
    // No backdating: a suite still writing to its own file has a fresh mtime.
    recordCreatedEmail("active+clerk_test@evoa.fit", activeRunId);

    // act
    const leftovers = findLeftoverRunIds(currentRunId);

    // assert
    expect(leftovers).not.toContain(activeRunId);
  });

  it("reports a foreign registry file younger than the age guard as possibly active", () => {
    // arrange
    const currentRunId = uniqueRunId("current");
    const activeRunId = uniqueRunId("active");
    const oldRunId = uniqueRunId("old");
    createdRunIds.push(currentRunId, activeRunId, oldRunId);
    recordCreatedEmail("current+clerk_test@evoa.fit", currentRunId);
    recordCreatedEmail("active+clerk_test@evoa.fit", activeRunId);
    recordCreatedEmail("old+clerk_test@evoa.fit", oldRunId);
    backdateRegistryFile(oldRunId, MIN_LEFTOVER_AGE_MS + 60_000);

    // act
    const possiblyActive = findPossiblyActiveRunIds(currentRunId);

    // assert
    expect(possiblyActive).toContain(activeRunId);
    expect(possiblyActive).not.toContain(oldRunId);
    expect(possiblyActive).not.toContain(currentRunId);
  });

  it("deletes a run's registry file", () => {
    // arrange
    const runId = uniqueRunId("delete");
    createdRunIds.push(runId);
    recordCreatedEmail("delete-me+clerk_test@evoa.fit", runId);

    // act
    deleteRegistryFile(runId);

    // assert
    expect(existsSync(registryPathFor(runId))).toBe(false);
  });

  describe("deleteRecordedClerkUser", () => {
    it("skips an address that does not carry the +clerk_test convention, without looking it up", async () => {
      // arrange
      const usersApi: ClerkUsersApi = {
        getUserList: async () => {
          throw new Error("must not be looked up for a non +clerk_test address");
        },
        deleteUser: async () => {
          throw new Error("must not be called for a non +clerk_test address");
        },
      };

      // act
      const result = await deleteRecordedClerkUser(usersApi, "real-user@evoa.fit");

      // assert
      expect(result).toEqual({ email: "real-user@evoa.fit", outcome: "skipped" });
    });

    it("reports not-found when Clerk has no matching user", async () => {
      // arrange
      const usersApi: ClerkUsersApi = {
        getUserList: async () => ({ data: [] }),
        deleteUser: async () => {
          throw new Error("must not be called when no user matched");
        },
      };

      // act
      const result = await deleteRecordedClerkUser(usersApi, "gone+clerk_test@evoa.fit");

      // assert
      expect(result).toEqual({ email: "gone+clerk_test@evoa.fit", outcome: "not-found" });
    });

    it("deletes a matching test user", async () => {
      // arrange
      const deletedIds: string[] = [];
      const usersApi: ClerkUsersApi = {
        getUserList: async () => ({ data: [{ id: "user_123" }] }),
        deleteUser: async (userId) => {
          deletedIds.push(userId);
        },
      };

      // act
      const result = await deleteRecordedClerkUser(usersApi, "present+clerk_test@evoa.fit");

      // assert
      expect(result).toEqual({ email: "present+clerk_test@evoa.fit", outcome: "deleted" });
      expect(deletedIds).toEqual(["user_123"]);
    });

    it("reports a failure without throwing", async () => {
      // arrange
      const usersApi: ClerkUsersApi = {
        getUserList: async () => {
          throw new Error("Clerk API unavailable");
        },
        deleteUser: async () => {},
      };

      // act
      const result = await deleteRecordedClerkUser(usersApi, "flaky+clerk_test@evoa.fit");

      // assert
      expect(result).toEqual({
        email: "flaky+clerk_test@evoa.fit",
        outcome: "failed",
        reason: "Clerk API unavailable",
      });
    });
  });

  describe("hasDeletionFailures / summarizeDeletionResults", () => {
    it("treats skipped and not-found as resolved, only a genuine failure as blocking", () => {
      // arrange
      const results = [
        { email: "a+clerk_test@evoa.fit", outcome: "deleted" as const },
        { email: "b@evoa.fit", outcome: "skipped" as const },
        { email: "c+clerk_test@evoa.fit", outcome: "not-found" as const },
      ];

      // act
      const blocked = hasDeletionFailures(results);

      // assert
      expect(blocked).toBe(false);
    });

    it("flags a genuine failure as blocking", () => {
      // arrange
      const results = [
        { email: "a+clerk_test@evoa.fit", outcome: "failed" as const, reason: "network error" },
      ];

      // act
      const blocked = hasDeletionFailures(results);

      // assert
      expect(blocked).toBe(true);
    });

    it("summarizes a non +clerk_test address as skipped, not failed, and calls recorded emails 'recorded'", () => {
      // arrange
      const results = [
        { email: "a+clerk_test@evoa.fit", outcome: "deleted" as const },
        { email: "b@evoa.fit", outcome: "skipped" as const },
      ];

      // act
      const summary = summarizeDeletionResults(results);

      // assert
      expect(summary).toContain("2 recorded");
      expect(summary).toContain("1 deleted");
      expect(summary).toContain("1 skipped: b@evoa.fit");
      expect(summary).not.toContain("failed");
    });
  });

  // These two mirror exactly what global-teardown.ts (this run's own users)
  // and global-setup.ts's leftover sweep (prior runs' users) do with the
  // real Clerk Backend client, just with a stubbed ClerkUsersApi in place of
  // it — proving the "keep the file so the next sweep can retry" contract
  // without ever calling Clerk.
  describe("registry file lifecycle matches teardown/sweep decisions", () => {
    it("keeps the file when a deletion genuinely fails", async () => {
      // arrange
      const runId = uniqueRunId("keep-on-failure");
      createdRunIds.push(runId);
      recordCreatedEmail("flaky+clerk_test@evoa.fit", runId);
      const usersApi: ClerkUsersApi = {
        getUserList: async () => {
          throw new Error("Clerk API unavailable");
        },
        deleteUser: async () => {},
      };

      // act
      const results = [];
      for (const email of readCreatedEmails(runId)) {
        results.push(await deleteRecordedClerkUser(usersApi, email));
      }
      if (!hasDeletionFailures(results)) {
        deleteRegistryFile(runId);
      }

      // assert
      expect(existsSync(registryPathFor(runId))).toBe(true);
    });

    it("removes the file once every recorded email resolves without a failure", async () => {
      // arrange
      const runId = uniqueRunId("clean-run");
      createdRunIds.push(runId);
      recordCreatedEmail("present+clerk_test@evoa.fit", runId);
      recordCreatedEmail("not-a-test-address@evoa.fit", runId);
      const usersApi: ClerkUsersApi = {
        getUserList: async () => ({ data: [{ id: "user_1" }] }),
        deleteUser: async () => {},
      };

      // act
      const results = [];
      for (const email of readCreatedEmails(runId)) {
        results.push(await deleteRecordedClerkUser(usersApi, email));
      }
      if (!hasDeletionFailures(results)) {
        deleteRegistryFile(runId);
      }

      // assert
      expect(existsSync(registryPathFor(runId))).toBe(false);
    });
  });
});
