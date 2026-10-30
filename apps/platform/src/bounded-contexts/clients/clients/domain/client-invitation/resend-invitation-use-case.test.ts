import { describe, expect, it, vi } from "vitest";

import type { InvitationResendOutcome } from "./client-invitation";
import type { InvitedClient } from "./invited-clients-port";
import { ResendInvitationUseCase } from "./resend-invitation-use-case";

const invitedClient: InvitedClient = {
  id: "client-1",
  email: "ana@example.com",
  firstName: "Ana",
  authSubjectId: null,
  accountInvitationId: "invitation-1",
  coachingCancelledOrEnded: false,
};

function resendDependencies(
  overrides: {
    client?: InvitedClient | null;
    outcome?: InvitationResendOutcome;
  } = {},
) {
  return {
    accountInvitationsPort: {
      resend: vi
        .fn()
        .mockResolvedValue(
          overrides.outcome ?? { status: "sent", email: "ana@example.com" },
        ),
    },
    invitedClientsPort: {
      findById: vi
        .fn()
        .mockResolvedValue(
          overrides.client === undefined ? invitedClient : overrides.client,
        ),
    },
  };
}

describe("ResendInvitationUseCase", () => {
  it("re-sends the account invitation she holds and answers the address it went to", async () => {
    // arrange
    const dependencies = resendDependencies();
    const resendInvitationUseCase = new ResendInvitationUseCase(dependencies);

    // act
    const result = await resendInvitationUseCase.execute(invitedClient.id);

    // assert
    expect(result).toEqual({ status: "sent", email: "ana@example.com" });
    expect(dependencies.accountInvitationsPort.resend).toHaveBeenCalledWith({
      invitationId: "invitation-1",
      firstName: "Ana",
    });
  });

  it.each([
    ["failed", { status: "failed" }, { status: "failed" }],
    [
      "already accepted",
      { status: "already-accepted" },
      { status: "already-admitted" },
    ],
    ["not found", { status: "not-found" }, { status: "not-found" }],
  ] as const)(
    "answers the account invitation's %s outcome in the coach's terms",
    async (_label, outcome, expected) => {
      // arrange
      const resendInvitationUseCase = new ResendInvitationUseCase(
        resendDependencies({ outcome }),
      );

      // act
      const result = await resendInvitationUseCase.execute(invitedClient.id);

      // assert
      expect(result).toEqual(expected);
    },
  );

  it("a resend after the account exists is refused", async () => {
    // arrange
    const dependencies = resendDependencies({
      client: { ...invitedClient, authSubjectId: "user_ana" },
    });
    const resendInvitationUseCase = new ResendInvitationUseCase(dependencies);

    // act
    const result = await resendInvitationUseCase.execute(invitedClient.id);

    // assert
    expect(result).toEqual({ status: "already-admitted" });
    expect(dependencies.accountInvitationsPort.resend).not.toHaveBeenCalled();
  });

  it("refuses a resend once her coaching is cancelled or ended, touching nothing", async () => {
    // arrange
    const dependencies = resendDependencies({
      client: { ...invitedClient, coachingCancelledOrEnded: true },
    });
    const resendInvitationUseCase = new ResendInvitationUseCase(dependencies);

    // act
    const result = await resendInvitationUseCase.execute(invitedClient.id);

    // assert
    expect(result).toEqual({ status: "subscription-cancelled-or-ended" });
    expect(dependencies.accountInvitationsPort.resend).not.toHaveBeenCalled();
  });

  it.each([
    [
      "no invitation",
      { client: { ...invitedClient, accountInvitationId: null } },
    ],
    ["no client", { client: null }],
  ] as const)("answers not-found for %s", async (_label, overrides) => {
    // arrange
    const dependencies = resendDependencies(overrides);
    const resendInvitationUseCase = new ResendInvitationUseCase(dependencies);

    // act
    const result = await resendInvitationUseCase.execute(invitedClient.id);

    // assert
    expect(result).toEqual({ status: "not-found" });
    expect(dependencies.accountInvitationsPort.resend).not.toHaveBeenCalled();
  });
});
