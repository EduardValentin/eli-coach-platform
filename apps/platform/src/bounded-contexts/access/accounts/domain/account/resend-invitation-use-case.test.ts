import { describe, expect, it, vi } from "vitest";

import { AccountInvitation } from "./account-invitation";
import type { AccountInvitationIncidentsPort } from "./account-invitation-incidents-port";
import type { AccountInvitationNotificationsPort } from "./account-invitation-notifications-port";
import type { AccountInvitationsPort } from "./account-invitations-port";
import type { IdentityInvitationsPort } from "./identity-invitations-port";
import type { InvitationTokenGeneratorPort } from "./invitation-token-generator-port";
import { ResendInvitationUseCase } from "./resend-invitation-use-case";

const NOW = new Date("2026-10-05T10:00:00.000Z");
const FIRST_SENT_AT = new Date("2026-09-27T10:00:00.000Z");
const RAW_TOKEN = "fresh-raw-token";
const FRESH_TOKEN_HASH = "e".repeat(64);
const EARLIER_PROVIDER = {
  id: "inv_clerk_1",
  url: "https://accounts.example/sign-up?__clerk_ticket=first",
};
const FRESH_PROVIDER = {
  id: "inv_clerk_2",
  url: "https://accounts.example/sign-up?__clerk_ticket=fresh",
};
const COMMAND = { invitationId: "invitation-1", firstName: "Ana" };

function sentInvitation(
  overrides: Partial<Parameters<typeof AccountInvitation.reconstitute>[0]> = {},
): AccountInvitation {
  return AccountInvitation.reconstitute({
    ...AccountInvitation.issue({
      id: "invitation-1",
      email: "ana@example.com",
      role: "CLIENT",
      tokenHash: "c".repeat(64),
      sentAt: FIRST_SENT_AT,
    }).toSnapshot(),
    provider: EARLIER_PROVIDER,
    emailSentAt: FIRST_SENT_AT,
    ...overrides,
  });
}

function createInvitations(found: AccountInvitation | null) {
  return {
    findById: vi.fn().mockResolvedValue(found),
    findByTokenHash: vi.fn().mockResolvedValue(found),
    findAcceptedBy: vi.fn().mockResolvedValue(null),
    insert: vi.fn().mockResolvedValue(undefined),
    reissue: vi.fn().mockResolvedValue(undefined),
    recordProvider: vi.fn().mockResolvedValue(undefined),
    recordEmailSent: vi.fn().mockResolvedValue(undefined),
    recordEmailDeliveryFailed: vi.fn().mockResolvedValue(undefined),
    accept: vi.fn().mockResolvedValue("accepted"),
  } satisfies AccountInvitationsPort;
}

function resendDependencies(
  overrides: {
    invitation?: AccountInvitation | null;
    delivery?: "sent" | "failed";
  } = {},
) {
  return {
    clockPort: { now: () => NOW },
    identityInvitationsPort: {
      create: vi.fn().mockResolvedValue(FRESH_PROVIDER),
      replace: vi.fn().mockResolvedValue(FRESH_PROVIDER),
    } satisfies IdentityInvitationsPort,
    accountInvitationIncidentsPort: {
      invitationEmailFailed: vi.fn(),
      invitationResent: vi.fn(),
      invitationResendFailed: vi.fn(),
    } satisfies AccountInvitationIncidentsPort,
    accountInvitationsPort: createInvitations(
      overrides.invitation === undefined
        ? sentInvitation()
        : overrides.invitation,
    ),
    accountInvitationNotificationsPort: {
      sendInvitation: vi.fn().mockResolvedValue(overrides.delivery ?? "sent"),
    } satisfies AccountInvitationNotificationsPort,
    invitationTokenGeneratorPort: {
      create: vi
        .fn()
        .mockReturnValue({ rawToken: RAW_TOKEN, sha256: FRESH_TOKEN_HASH }),
    } satisfies InvitationTokenGeneratorPort,
  };
}

describe("ResendInvitationUseCase", () => {
  it("reissues her invitation, replaces the provider invitation and sends the same invitation email with the fresh link", async () => {
    // arrange
    const invitation = sentInvitation();
    const dependencies = resendDependencies({ invitation });
    const resendInvitationUseCase = new ResendInvitationUseCase(dependencies);

    // act
    const result = await resendInvitationUseCase.execute(COMMAND);

    // assert
    expect(result).toEqual({ status: "sent", email: "ana@example.com" });
    expect(dependencies.accountInvitationsPort.reissue).toHaveBeenCalledWith(
      invitation.reissue({ tokenHash: FRESH_TOKEN_HASH, sentAt: NOW }),
    );
    expect(dependencies.identityInvitationsPort.replace).toHaveBeenCalledWith({
      email: "ana@example.com",
      invitationId: "invitation-1",
      previous: EARLIER_PROVIDER,
    });
    expect(dependencies.identityInvitationsPort.create).not.toHaveBeenCalled();
    expect(
      dependencies.accountInvitationsPort.recordProvider,
    ).toHaveBeenCalledWith({
      invitationId: "invitation-1",
      provider: FRESH_PROVIDER,
    });
    expect(
      dependencies.accountInvitationNotificationsPort.sendInvitation,
    ).toHaveBeenCalledWith({
      invitationId: "invitation-1",
      email: "ana@example.com",
      firstName: "Ana",
      rawToken: RAW_TOKEN,
      sentAt: NOW,
      expiresAt: new Date("2026-11-04T10:00:00.000Z"),
    });
    expect(
      dependencies.accountInvitationsPort.recordEmailSent,
    ).toHaveBeenCalledWith({
      invitationId: "invitation-1",
      at: NOW,
    });
    expect(
      dependencies.accountInvitationIncidentsPort.invitationResent,
    ).toHaveBeenCalledWith({
      invitationId: "invitation-1",
    });
    const order = [
      dependencies.accountInvitationsPort.reissue,
      dependencies.identityInvitationsPort.replace,
      dependencies.accountInvitationsPort.recordProvider,
      dependencies.accountInvitationNotificationsPort.sendInvitation,
    ].map((step) => step.mock.invocationCallOrder[0]);
    expect(order).toEqual([...order].sort((left, right) => left - right));
  });

  it("a resend with no provider recorded creates the provider invitation", async () => {
    // arrange
    const dependencies = resendDependencies({
      invitation: sentInvitation({ provider: null }),
    });
    const resendInvitationUseCase = new ResendInvitationUseCase(dependencies);

    // act
    const result = await resendInvitationUseCase.execute(COMMAND);

    // assert
    expect(result).toEqual({ status: "sent", email: "ana@example.com" });
    expect(dependencies.identityInvitationsPort.create).toHaveBeenCalledWith({
      email: "ana@example.com",
      invitationId: "invitation-1",
    });
    expect(dependencies.identityInvitationsPort.replace).not.toHaveBeenCalled();
    expect(
      dependencies.accountInvitationsPort.recordProvider,
    ).toHaveBeenCalledWith({
      invitationId: "invitation-1",
      provider: FRESH_PROVIDER,
    });
  });

  it("a resend retried after a provider failure revokes the earlier provider invitation", async () => {
    // arrange
    const invitation = sentInvitation();
    const firstDependencies = resendDependencies({ invitation });
    firstDependencies.identityInvitationsPort.replace.mockRejectedValue(
      new Error("Clerk unavailable"),
    );
    const firstAttempt = new ResendInvitationUseCase(firstDependencies);
    const reissuedRecord = invitation.reissue({
      tokenHash: FRESH_TOKEN_HASH,
      sentAt: NOW,
    });
    const retryDependencies = resendDependencies({
      invitation: reissuedRecord,
    });
    const retry = new ResendInvitationUseCase(retryDependencies);

    // act
    const firstResult = await firstAttempt.execute(COMMAND);
    const retryResult = await retry.execute(COMMAND);

    // assert
    expect(firstResult).toEqual({ status: "failed" });
    expect(
      firstDependencies.accountInvitationsPort.recordProvider,
    ).not.toHaveBeenCalled();
    expect(
      firstDependencies.accountInvitationNotificationsPort.sendInvitation,
    ).not.toHaveBeenCalled();
    expect(
      firstDependencies.accountInvitationIncidentsPort.invitationResendFailed,
    ).toHaveBeenCalledWith({ invitationId: "invitation-1", step: "provider" });
    expect(reissuedRecord.provider).toEqual(EARLIER_PROVIDER);
    expect(retryResult).toEqual({ status: "sent", email: "ana@example.com" });
    expect(
      retryDependencies.identityInvitationsPort.replace,
    ).toHaveBeenCalledWith({
      email: "ana@example.com",
      invitationId: "invitation-1",
      previous: EARLIER_PROVIDER,
    });
  });

  it("marks the email failed and answers failed when the invitation email cannot be sent", async () => {
    // arrange
    const dependencies = resendDependencies({ delivery: "failed" });
    const resendInvitationUseCase = new ResendInvitationUseCase(dependencies);

    // act
    const result = await resendInvitationUseCase.execute(COMMAND);

    // assert
    expect(result).toEqual({ status: "failed" });
    expect(
      dependencies.accountInvitationsPort.recordProvider,
    ).toHaveBeenCalled();
    expect(
      dependencies.accountInvitationsPort.recordEmailDeliveryFailed,
    ).toHaveBeenCalledWith({ invitationId: "invitation-1", at: NOW });
    expect(
      dependencies.accountInvitationsPort.recordEmailSent,
    ).not.toHaveBeenCalled();
    expect(
      dependencies.accountInvitationIncidentsPort.invitationResendFailed,
    ).toHaveBeenCalledWith({
      invitationId: "invitation-1",
      step: "email",
    });
    expect(
      dependencies.accountInvitationIncidentsPort.invitationResent,
    ).not.toHaveBeenCalled();
  });

  it("refuses an accepted invitation as already accepted", async () => {
    // arrange
    const dependencies = resendDependencies({
      invitation: sentInvitation({
        acceptedAt: FIRST_SENT_AT,
        acceptedByAuthSubjectId: "user_ana",
      }),
    });
    const resendInvitationUseCase = new ResendInvitationUseCase(dependencies);

    // act
    const result = await resendInvitationUseCase.execute(COMMAND);

    // assert
    expect(result).toEqual({ status: "already-accepted" });
    expect(dependencies.accountInvitationsPort.reissue).not.toHaveBeenCalled();
  });

  it("answers not-found for no invitation", async () => {
    // arrange
    const dependencies = resendDependencies({ invitation: null });
    const resendInvitationUseCase = new ResendInvitationUseCase(dependencies);

    // act
    const result = await resendInvitationUseCase.execute(COMMAND);

    // assert
    expect(result).toEqual({ status: "not-found" });
    expect(dependencies.accountInvitationsPort.reissue).not.toHaveBeenCalled();
  });
});
