import { describe, expect, it } from "vitest";

import { releaseClerkAccounts, type ClerkAccountsApi } from "./clerk-accounts";

const COACH = "e2e-run-1+clerk_test@evoa.fit";
const CLIENT = "e2e-run-2+clerk_test@evoa.fit";

type ClerkFailure = "none" | "deletion" | "revocation";

function clerkFailing(failure: ClerkFailure) {
  const deletedIds: string[] = [];
  const revokedIds: string[] = [];
  const clerk: ClerkAccountsApi = {
    users: {
      getUserList: async ({ emailAddress }) => ({
        data: [{ id: `user_${emailAddress[0]}` }],
      }),
      deleteUser: async (userId) => {
        if (failure === "deletion") throw new Error("Clerk API unavailable");
        deletedIds.push(userId);
      },
    },
    invitations: {
      getInvitationList: async ({ query }) => {
        if (failure === "revocation") throw new Error("Too Many Requests");

        return { data: [{ emailAddress: query, id: `inv_${query}` }] };
      },
      revokeInvitation: async (invitationId) => {
        revokedIds.push(invitationId);
      },
    },
  };

  return { clerk, deletedIds, revokedIds };
}

describe("releaseClerkAccounts", () => {
  it("deletes the users and revokes the pending invitations of the addresses, and counts them released", async () => {
    // arrange
    const { clerk, deletedIds, revokedIds } = clerkFailing("none");

    // act
    const release = await releaseClerkAccounts(clerk, [COACH, CLIENT]);

    // assert
    expect(release.released).toBe(true);
    expect(deletedIds).toEqual([`user_${COACH}`, `user_${CLIENT}`]);
    expect(revokedIds).toEqual([`inv_${COACH}`, `inv_${CLIENT}`]);
    expect(release.deletions.map(({ outcome }) => outcome)).toEqual([
      "deleted",
      "deleted",
    ]);
    expect(release.revocations.failed).toEqual([]);
  });

  it("does not count the addresses released when a user could not be deleted", async () => {
    // arrange
    const { clerk, revokedIds } = clerkFailing("deletion");

    // act
    const release = await releaseClerkAccounts(clerk, [COACH]);

    // assert
    expect(release.released).toBe(false);
    expect(release.deletions.map(({ outcome }) => outcome)).toEqual(["failed"]);
    expect(revokedIds).toEqual([`inv_${COACH}`]);
  });

  it("does not count the addresses released when an invitation could not be revoked", async () => {
    // arrange
    const { clerk, deletedIds } = clerkFailing("revocation");

    // act
    const release = await releaseClerkAccounts(clerk, [COACH]);

    // assert
    expect(release.released).toBe(false);
    expect(deletedIds).toEqual([`user_${COACH}`]);
    expect(release.revocations.failed).toEqual([
      `${COACH} (Too Many Requests)`,
    ]);
  });
});
