import { describe, expect, it, vi } from "vitest";

import type { InvitedClient } from "./invited-clients-port";
import { ReadClientInvitationUseCase } from "./read-client-invitation-use-case";

const SENT_AT = new Date("2026-09-27T10:00:00.000Z");
const EXPIRES_AT = new Date("2026-10-27T10:00:00.000Z");

const invitedClient: InvitedClient = {
  id: "client-1",
  email: "ana@example.com",
  firstName: "Ana",
  authSubjectId: null,
  accountInvitationId: "invitation-1",
  coachingCancelledOrEnded: false,
};

function readDependencies(client: InvitedClient | null) {
  return {
    accountInvitationsPort: {
      standingOf: vi.fn().mockResolvedValue({
        state: "email-failed",
        sentAt: SENT_AT,
        expiresAt: EXPIRES_AT,
      }),
    },
    invitedClientsPort: { findById: vi.fn().mockResolvedValue(client) },
  };
}

describe("ReadClientInvitationUseCase", () => {
  it("reads the standing of the account invitation she holds", async () => {
    // arrange
    const dependencies = readDependencies(invitedClient);
    const readClientInvitationUseCase = new ReadClientInvitationUseCase(
      dependencies,
    );

    // act
    const result = await readClientInvitationUseCase.execute("client-1");

    // assert
    expect(result).toEqual({
      state: "email-failed",
      sentAt: SENT_AT,
      expiresAt: EXPIRES_AT,
    });
    expect(dependencies.accountInvitationsPort.standingOf).toHaveBeenCalledWith(
      "invitation-1",
    );
  });

  it.each([
    ["no client", null],
    [
      "a client without an invitation",
      { ...invitedClient, accountInvitationId: null },
    ],
  ])("reads nothing for %s", async (_label, client) => {
    // arrange
    const dependencies = readDependencies(client);
    const readClientInvitationUseCase = new ReadClientInvitationUseCase(
      dependencies,
    );

    // act
    const result = await readClientInvitationUseCase.execute("client-1");

    // assert
    expect(result).toBeNull();
    expect(
      dependencies.accountInvitationsPort.standingOf,
    ).not.toHaveBeenCalled();
  });
});
