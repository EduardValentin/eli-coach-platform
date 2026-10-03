import { describe, expect, it, vi } from "vitest";

import { ClientInvitation } from "./client-invitation";
import type { ClientInvitationIncidents } from "./client-invitation-incidents";
import type { ClientInvitationNotifications } from "./client-invitation-notifications";
import type { ClientInvitations } from "./client-invitations";
import type { IdentityInvitations } from "./identity-invitations";
import type { InvitationTokenGenerator } from "./invitation-token";
import type { InvitedClient, InvitedClients } from "./invited-client";
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

const invitedClient: InvitedClient = {
  id: "client-1",
  email: "ana@example.com",
  firstName: "Ana",
  authSubjectId: null,
  subscriptionCancelledOrEnded: false,
};

function sentInvitation(
  overrides: Partial<Parameters<typeof ClientInvitation.reconstitute>[0]> = {},
): ClientInvitation {
  return ClientInvitation.reconstitute({
    ...ClientInvitation.issue({
      id: "invitation-1",
      clientId: invitedClient.id,
      email: invitedClient.email,
      tokenHash: "c".repeat(64),
      sentAt: FIRST_SENT_AT,
    }),
    provider: EARLIER_PROVIDER,
    emailSentAt: FIRST_SENT_AT,
    ...overrides,
  });
}

function createInvitations(found: ClientInvitation | null) {
  return {
    findById: vi.fn().mockResolvedValue(found),
    findByClientId: vi.fn().mockResolvedValue(found),
    findByTokenHash: vi.fn().mockResolvedValue(found),
    insert: vi.fn().mockResolvedValue(undefined),
    reissue: vi.fn().mockResolvedValue(undefined),
    recordProvider: vi.fn().mockResolvedValue(undefined),
    recordEmailSent: vi.fn().mockResolvedValue(undefined),
    recordEmailDeliveryFailed: vi.fn().mockResolvedValue(undefined),
    accept: vi.fn().mockResolvedValue("accepted"),
  } satisfies ClientInvitations;
}

function resendDependencies(
  overrides: {
    client?: InvitedClient | null;
    invitation?: ClientInvitation | null;
    delivery?: "sent" | "failed";
  } = {},
) {
  return {
    clients: {
      findById: vi
        .fn()
        .mockResolvedValue(
          overrides.client === undefined ? invitedClient : overrides.client,
        ),
    } satisfies InvitedClients,
    clock: { now: () => NOW },
    identity: {
      create: vi.fn().mockResolvedValue(FRESH_PROVIDER),
      replace: vi.fn().mockResolvedValue(FRESH_PROVIDER),
      findInvitationIdForSubject: vi.fn().mockResolvedValue(null),
    } satisfies IdentityInvitations,
    incidents: {
      invitationEmailFailed: vi.fn(),
      invitationResent: vi.fn(),
      invitationResendFailed: vi.fn(),
    } satisfies ClientInvitationIncidents,
    invitations: createInvitations(
      overrides.invitation === undefined
        ? sentInvitation()
        : overrides.invitation,
    ),
    notifications: {
      sendInvitation: vi.fn().mockResolvedValue(overrides.delivery ?? "sent"),
    } satisfies ClientInvitationNotifications,
    tokenGenerator: {
      create: vi
        .fn()
        .mockReturnValue({ rawToken: RAW_TOKEN, sha256: FRESH_TOKEN_HASH }),
    } satisfies InvitationTokenGenerator,
  };
}

describe("ResendInvitationUseCase", () => {
  it("reissues her invitation, replaces the provider invitation and sends the same invitation email with the fresh link", async () => {
    // arrange
    const invitation = sentInvitation();
    const dependencies = resendDependencies({ invitation });
    const useCase = new ResendInvitationUseCase(dependencies);

    // act
    const result = await useCase.execute(invitedClient.id);

    // assert
    expect(result).toEqual({ status: "sent", email: "ana@example.com" });
    expect(dependencies.invitations.reissue).toHaveBeenCalledWith(
      invitation.reissue({ tokenHash: FRESH_TOKEN_HASH, sentAt: NOW }),
    );
    expect(dependencies.identity.replace).toHaveBeenCalledWith({
      email: invitedClient.email,
      invitationId: "invitation-1",
      previous: EARLIER_PROVIDER,
    });
    expect(dependencies.identity.create).not.toHaveBeenCalled();
    expect(dependencies.invitations.recordProvider).toHaveBeenCalledWith({
      invitationId: "invitation-1",
      provider: FRESH_PROVIDER,
    });
    expect(dependencies.notifications.sendInvitation).toHaveBeenCalledWith({
      invitationId: "invitation-1",
      email: invitedClient.email,
      firstName: invitedClient.firstName,
      rawToken: RAW_TOKEN,
      sentAt: NOW,
      expiresAt: new Date("2026-11-04T10:00:00.000Z"),
    });
    expect(dependencies.invitations.recordEmailSent).toHaveBeenCalledWith({
      invitationId: "invitation-1",
      at: NOW,
    });
    expect(dependencies.incidents.invitationResent).toHaveBeenCalledWith({
      invitationId: "invitation-1",
    });
    const order = [
      dependencies.invitations.reissue,
      dependencies.identity.replace,
      dependencies.invitations.recordProvider,
      dependencies.notifications.sendInvitation,
    ].map((step) => step.mock.invocationCallOrder[0]);
    expect(order).toEqual([...order].sort((left, right) => left - right));
  });

  it("a resend with no provider recorded creates the provider invitation", async () => {
    // arrange
    const dependencies = resendDependencies({
      invitation: sentInvitation({ provider: null }),
    });
    const useCase = new ResendInvitationUseCase(dependencies);

    // act
    const result = await useCase.execute(invitedClient.id);

    // assert
    expect(result).toEqual({ status: "sent", email: "ana@example.com" });
    expect(dependencies.identity.create).toHaveBeenCalledWith({
      email: invitedClient.email,
      invitationId: "invitation-1",
    });
    expect(dependencies.identity.replace).not.toHaveBeenCalled();
    expect(dependencies.invitations.recordProvider).toHaveBeenCalledWith({
      invitationId: "invitation-1",
      provider: FRESH_PROVIDER,
    });
  });

  it("a resend retried after a provider failure revokes the earlier provider invitation", async () => {
    // arrange
    const invitation = sentInvitation();
    const firstDependencies = resendDependencies({ invitation });
    firstDependencies.identity.replace.mockRejectedValue(
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
    const firstResult = await firstAttempt.execute(invitedClient.id);
    const retryResult = await retry.execute(invitedClient.id);

    // assert
    expect(firstResult).toEqual({ status: "failed" });
    expect(firstDependencies.invitations.recordProvider).not.toHaveBeenCalled();
    expect(
      firstDependencies.notifications.sendInvitation,
    ).not.toHaveBeenCalled();
    expect(
      firstDependencies.incidents.invitationResendFailed,
    ).toHaveBeenCalledWith({ invitationId: "invitation-1", step: "provider" });
    expect(reissuedRecord.provider).toEqual(EARLIER_PROVIDER);
    expect(retryResult).toEqual({ status: "sent", email: "ana@example.com" });
    expect(retryDependencies.identity.replace).toHaveBeenCalledWith({
      email: invitedClient.email,
      invitationId: "invitation-1",
      previous: EARLIER_PROVIDER,
    });
  });

  it("marks the email failed and answers failed when the invitation email cannot be sent", async () => {
    // arrange
    const dependencies = resendDependencies({ delivery: "failed" });
    const useCase = new ResendInvitationUseCase(dependencies);

    // act
    const result = await useCase.execute(invitedClient.id);

    // assert
    expect(result).toEqual({ status: "failed" });
    expect(dependencies.invitations.recordProvider).toHaveBeenCalled();
    expect(
      dependencies.invitations.recordEmailDeliveryFailed,
    ).toHaveBeenCalledWith({ invitationId: "invitation-1", at: NOW });
    expect(dependencies.invitations.recordEmailSent).not.toHaveBeenCalled();
    expect(dependencies.incidents.invitationResendFailed).toHaveBeenCalledWith({
      invitationId: "invitation-1",
      step: "email",
    });
    expect(dependencies.incidents.invitationResent).not.toHaveBeenCalled();
  });

  it("a resend after the account exists is refused", async () => {
    // arrange
    const dependencies = resendDependencies({
      client: { ...invitedClient, authSubjectId: "user_ana" },
    });
    const useCase = new ResendInvitationUseCase(dependencies);

    // act
    const result = await useCase.execute(invitedClient.id);

    // assert
    expect(result).toEqual({ status: "already-admitted" });
    expect(dependencies.invitations.reissue).not.toHaveBeenCalled();
    expect(dependencies.identity.replace).not.toHaveBeenCalled();
    expect(dependencies.notifications.sendInvitation).not.toHaveBeenCalled();
  });

  it("refuses a resend once her coaching is cancelled or ended, touching nothing", async () => {
    // arrange
    const dependencies = resendDependencies({
      client: { ...invitedClient, subscriptionCancelledOrEnded: true },
    });
    const useCase = new ResendInvitationUseCase(dependencies);

    // act
    const result = await useCase.execute(invitedClient.id);

    // assert
    expect(result).toEqual({ status: "subscription-cancelled-or-ended" });
    expect(dependencies.invitations.reissue).not.toHaveBeenCalled();
    expect(dependencies.identity.replace).not.toHaveBeenCalled();
    expect(dependencies.identity.create).not.toHaveBeenCalled();
    expect(dependencies.notifications.sendInvitation).not.toHaveBeenCalled();
  });

  it("refuses a used invitation as already admitted", async () => {
    // arrange
    const dependencies = resendDependencies({
      invitation: sentInvitation({
        usedAt: FIRST_SENT_AT,
        acceptedByAuthSubjectId: "user_ana",
      }),
    });
    const useCase = new ResendInvitationUseCase(dependencies);

    // act
    const result = await useCase.execute(invitedClient.id);

    // assert
    expect(result).toEqual({ status: "already-admitted" });
    expect(dependencies.invitations.reissue).not.toHaveBeenCalled();
  });

  it.each([
    ["no invitation", { invitation: null }],
    ["no client", { client: null }],
  ] as const)("answers not-found for %s", async (_label, overrides) => {
    // arrange
    const dependencies = resendDependencies(overrides);
    const useCase = new ResendInvitationUseCase(dependencies);

    // act
    const result = await useCase.execute(invitedClient.id);

    // assert
    expect(result).toEqual({ status: "not-found" });
    expect(dependencies.invitations.reissue).not.toHaveBeenCalled();
  });
});
