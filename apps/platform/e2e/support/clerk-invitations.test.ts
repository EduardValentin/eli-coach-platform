import { describe, expect, it } from "vitest";

import {
  revokePendingInvitations,
  summarizeRevocations,
  type ClerkInvitationsApi,
} from "./clerk-invitations";

const INVITEE = "e2e-run-2+clerk_test@evoa.fit";

function invitationsApiServing(
  pending: Array<{ emailAddress: string; id: string }>,
) {
  const revokedIds: string[] = [];
  const queries: string[] = [];
  const invitationsApi: ClerkInvitationsApi = {
    getInvitationList: async ({ query }) => {
      queries.push(query);
      return { data: pending };
    },
    revokeInvitation: async (invitationId) => {
      revokedIds.push(invitationId);
    },
  };

  return { invitationsApi, queries, revokedIds };
}

describe("revokePendingInvitations", () => {
  it("revokes the pending invitation of a run's test address", async () => {
    // arrange
    const clerk = invitationsApiServing([
      { emailAddress: INVITEE, id: "inv_1" },
    ]);

    // act
    const report = await revokePendingInvitations(clerk.invitationsApi, [
      INVITEE,
    ]);

    // assert
    expect(clerk.revokedIds).toEqual(["inv_1"]);
    expect(report).toEqual({ failed: [], revoked: [`inv_1 (${INVITEE})`] });
  });

  it("leaves an invitation whose address only resembles the run's address", async () => {
    // arrange
    const clerk = invitationsApiServing([
      { emailAddress: `other-${INVITEE}`, id: "inv_2" },
    ]);

    // act
    const report = await revokePendingInvitations(clerk.invitationsApi, [
      INVITEE,
    ]);

    // assert
    expect(clerk.revokedIds).toEqual([]);
    expect(report).toEqual({ failed: [], revoked: [] });
  });

  it("never looks up an address without the +clerk_test convention", async () => {
    // arrange
    const clerk = invitationsApiServing([
      { emailAddress: "real-client@evoa.fit", id: "inv_3" },
    ]);

    // act
    await revokePendingInvitations(clerk.invitationsApi, [
      "real-client@evoa.fit",
    ]);

    // assert
    expect(clerk.queries).toEqual([]);
    expect(clerk.revokedIds).toEqual([]);
  });

  it("reports a failed lookup without throwing", async () => {
    // arrange
    const invitationsApi: ClerkInvitationsApi = {
      getInvitationList: async () => {
        throw new Error("Clerk API unavailable");
      },
      revokeInvitation: async () => {},
    };

    // act
    const report = await revokePendingInvitations(invitationsApi, [INVITEE]);

    // assert
    expect(report).toEqual({
      failed: [`${INVITEE} (Clerk API unavailable)`],
      revoked: [],
    });
  });
});

describe("summarizeRevocations", () => {
  it("names each revoked invitation and each failure", () => {
    // arrange
    const report = {
      failed: [`${INVITEE} (Clerk API unavailable)`],
      revoked: [`inv_1 (${INVITEE})`],
    };

    // act
    const summary = summarizeRevocations(report);

    // assert
    expect(summary).toBe(
      `1 pending invitations revoked, revoked: inv_1 (${INVITEE}), 1 failed: ${INVITEE} (Clerk API unavailable)`,
    );
  });
});
