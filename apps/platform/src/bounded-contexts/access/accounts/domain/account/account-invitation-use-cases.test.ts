import { describe, expect, it, vi } from "vitest";

import { AccountInvitation } from "./account-invitation";
import type { AccountInvitationIds } from "./account-invitation-ids";
import type { AccountInvitationIncidents } from "./account-invitation-incidents";
import type { AccountInvitationNotifications } from "./account-invitation-notifications";
import type { AccountInvitations } from "./account-invitations";
import { EnsureInvitationDeliveredUseCase } from "./ensure-invitation-delivered-use-case";
import type { IdentityInvitations } from "./identity-invitations";
import type {
  InvitationTokenGenerator,
  InvitationTokenHasher,
} from "./invitation-token";
import { IssueInvitationUseCase } from "./issue-invitation-use-case";
import { ResolveInvitationUseCase } from "./resolve-invitation-use-case";

const NOW = new Date("2026-09-27T10:00:00.000Z");
const EARLIER = new Date("2026-09-26T10:00:00.000Z");
const RAW_TOKEN = "raw-invitation-token";
const TOKEN_HASH = "c".repeat(64);
const NEW_TOKEN_HASH = "d".repeat(64);
const EMAIL = "ana@example.com";
const PROVIDER = {
  id: "inv_clerk_1",
  url: "https://accounts.example/sign-up?__clerk_ticket=ticket",
};
const DELIVERY = { invitationId: "invitation-1", firstName: "Ana" };

function clockAt(now: Date) {
  return { now: () => now };
}

function invitation(
  overrides: Partial<Parameters<typeof AccountInvitation.reconstitute>[0]> = {},
): AccountInvitation {
  return AccountInvitation.reconstitute({
    ...AccountInvitation.issue({
      id: "invitation-1",
      email: EMAIL,
      role: "CLIENT",
      tokenHash: TOKEN_HASH,
      sentAt: EARLIER,
    }).toSnapshot(),
    ...overrides,
  });
}

function createInvitations(
  found: AccountInvitation | null,
): AccountInvitations & {
  [K in keyof AccountInvitations]: ReturnType<typeof vi.fn>;
} {
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
  };
}

function createIdentity() {
  return {
    create: vi.fn().mockResolvedValue(PROVIDER),
    replace: vi.fn().mockResolvedValue(PROVIDER),
  } satisfies IdentityInvitations;
}

function createNotifications(delivery: "sent" | "failed") {
  return {
    sendInvitation: vi.fn().mockResolvedValue(delivery),
  } satisfies AccountInvitationNotifications;
}

function createIncidents() {
  return {
    invitationEmailFailed: vi.fn(),
    invitationResent: vi.fn(),
    invitationResendFailed: vi.fn(),
  } satisfies AccountInvitationIncidents;
}

function createTokenGenerator(sha256: string) {
  return {
    create: vi.fn().mockReturnValue({ rawToken: RAW_TOKEN, sha256 }),
  } satisfies InvitationTokenGenerator;
}

function createTokenHasher() {
  return {
    sha256: vi.fn().mockReturnValue(TOKEN_HASH),
  } satisfies InvitationTokenHasher;
}

function createIds() {
  return {
    generate: vi.fn().mockReturnValue("invitation-1"),
  } satisfies AccountInvitationIds;
}

describe("IssueInvitationUseCase", () => {
  it("issues a thirty-day CLIENT invitation under a fresh id and stores it", async () => {
    // arrange
    const dependencies = {
      clock: clockAt(NOW),
      ids: createIds(),
      invitations: createInvitations(null),
      tokenGenerator: createTokenGenerator(TOKEN_HASH),
    };
    const useCase = new IssueInvitationUseCase(dependencies);

    // act
    const result = await useCase.execute({ email: EMAIL });

    // assert
    expect(result).toEqual({ invitationId: "invitation-1" });
    expect(dependencies.invitations.insert).toHaveBeenCalledWith(
      AccountInvitation.issue({
        id: "invitation-1",
        email: EMAIL,
        role: "CLIENT",
        tokenHash: TOKEN_HASH,
        sentAt: NOW,
      }),
    );
  });
});

describe("EnsureInvitationDeliveredUseCase", () => {
  function deliveryDependencies(overrides: {
    existing: AccountInvitation | null;
    delivery?: "sent" | "failed";
  }) {
    return {
      clock: clockAt(NOW),
      identity: createIdentity(),
      incidents: createIncidents(),
      invitations: createInvitations(overrides.existing),
      notifications: createNotifications(overrides.delivery ?? "sent"),
      tokenGenerator: createTokenGenerator(NEW_TOKEN_HASH),
    };
  }

  it("reissues the token, creates the identity invitation and emails the raw token for an invitation that awaits its email", async () => {
    // arrange
    const existing = invitation();
    const dependencies = deliveryDependencies({ existing });
    const useCase = new EnsureInvitationDeliveredUseCase(dependencies);

    // act
    await useCase.execute(DELIVERY);

    // assert
    expect(dependencies.invitations.insert).not.toHaveBeenCalled();
    expect(dependencies.invitations.reissue).toHaveBeenCalledWith(
      existing.reissue({ tokenHash: NEW_TOKEN_HASH, sentAt: NOW }),
    );
    expect(dependencies.identity.create).toHaveBeenCalledWith({
      email: EMAIL,
      invitationId: "invitation-1",
    });
    expect(dependencies.invitations.recordProvider).toHaveBeenCalledWith({
      invitationId: "invitation-1",
      provider: PROVIDER,
    });
    expect(dependencies.notifications.sendInvitation).toHaveBeenCalledWith({
      invitationId: "invitation-1",
      email: EMAIL,
      firstName: "Ana",
      rawToken: RAW_TOKEN,
      sentAt: NOW,
      expiresAt: new Date("2026-10-27T10:00:00.000Z"),
    });
    expect(dependencies.invitations.recordEmailSent).toHaveBeenCalledWith({
      invitationId: "invitation-1",
      at: NOW,
    });
    expect(
      dependencies.invitations.recordEmailDeliveryFailed,
    ).not.toHaveBeenCalled();
  });

  it("does nothing on a redelivery when the invitation, its identity invitation and its email all exist", async () => {
    // arrange
    const dependencies = deliveryDependencies({
      existing: invitation({ provider: PROVIDER, emailSentAt: EARLIER }),
    });
    const useCase = new EnsureInvitationDeliveredUseCase(dependencies);

    // act
    await useCase.execute(DELIVERY);

    // assert
    expect(dependencies.tokenGenerator.create).not.toHaveBeenCalled();
    expect(dependencies.invitations.reissue).not.toHaveBeenCalled();
    expect(dependencies.identity.create).not.toHaveBeenCalled();
    expect(dependencies.invitations.recordProvider).not.toHaveBeenCalled();
    expect(dependencies.notifications.sendInvitation).not.toHaveBeenCalled();
  });

  it("does not resend on a redelivery after the email delivery failed", async () => {
    // arrange
    const dependencies = deliveryDependencies({
      existing: invitation({
        provider: PROVIDER,
        emailDeliveryFailedAt: EARLIER,
      }),
    });
    const useCase = new EnsureInvitationDeliveredUseCase(dependencies);

    // act
    await useCase.execute(DELIVERY);

    // assert
    expect(dependencies.invitations.reissue).not.toHaveBeenCalled();
    expect(dependencies.notifications.sendInvitation).not.toHaveBeenCalled();
  });

  it("keeps the identity invitation it already created when it reissues the token", async () => {
    // arrange
    const dependencies = deliveryDependencies({
      existing: invitation({ provider: PROVIDER }),
    });
    const useCase = new EnsureInvitationDeliveredUseCase(dependencies);

    // act
    await useCase.execute(DELIVERY);

    // assert
    expect(dependencies.invitations.reissue).toHaveBeenCalledTimes(1);
    expect(dependencies.identity.create).not.toHaveBeenCalled();
    expect(dependencies.notifications.sendInvitation).toHaveBeenCalledTimes(1);
  });

  it("delivering again after a reissue creates no second provider invitation", async () => {
    // arrange
    const reissuedByResend = invitation({ provider: PROVIDER }).reissue({
      tokenHash: NEW_TOKEN_HASH,
      sentAt: EARLIER,
    });
    const dependencies = deliveryDependencies({ existing: reissuedByResend });
    const useCase = new EnsureInvitationDeliveredUseCase(dependencies);

    // act
    await useCase.execute(DELIVERY);

    // assert
    expect(dependencies.identity.create).not.toHaveBeenCalled();
    expect(dependencies.identity.replace).not.toHaveBeenCalled();
    expect(dependencies.invitations.recordProvider).not.toHaveBeenCalled();
  });

  it("propagates an identity provider failure before any email is sent", async () => {
    // arrange
    const failure = new Error("Clerk unavailable");
    const dependencies = deliveryDependencies({ existing: invitation() });
    dependencies.identity.create.mockRejectedValue(failure);
    const useCase = new EnsureInvitationDeliveredUseCase(dependencies);

    // act
    const delivery = useCase.execute(DELIVERY);

    // assert
    await expect(delivery).rejects.toBe(failure);
    expect(dependencies.invitations.reissue).toHaveBeenCalledTimes(1);
    expect(dependencies.invitations.recordProvider).not.toHaveBeenCalled();
    expect(dependencies.notifications.sendInvitation).not.toHaveBeenCalled();
  });

  it.each([
    ["answers failed", () => createNotifications("failed").sendInvitation],
    [
      "throws",
      () => vi.fn().mockRejectedValue(new Error("email provider down")),
    ],
  ])(
    "records the failed delivery and the incident without failing when the email %s",
    async (_label, sendInvitation) => {
      // arrange
      const dependencies = deliveryDependencies({ existing: invitation() });
      dependencies.notifications.sendInvitation = sendInvitation();
      const useCase = new EnsureInvitationDeliveredUseCase(dependencies);

      // act
      await useCase.execute(DELIVERY);

      // assert
      expect(
        dependencies.invitations.recordEmailDeliveryFailed,
      ).toHaveBeenCalledWith({ invitationId: "invitation-1", at: NOW });
      expect(dependencies.incidents.invitationEmailFailed).toHaveBeenCalledWith(
        { invitationId: "invitation-1" },
      );
      expect(dependencies.invitations.recordEmailSent).not.toHaveBeenCalled();
    },
  );

  it("refuses to deliver an invitation that does not exist", async () => {
    // arrange
    const dependencies = deliveryDependencies({ existing: null });
    const useCase = new EnsureInvitationDeliveredUseCase(dependencies);

    // act
    const delivery = useCase.execute({
      invitationId: "invitation-404",
      firstName: "Ana",
    });

    // assert
    await expect(delivery).rejects.toThrow("invitation-404");
    expect(dependencies.invitations.reissue).not.toHaveBeenCalled();
  });
});

describe("ResolveInvitationUseCase", () => {
  function resolveDependencies(found: AccountInvitation | null, now = NOW) {
    return {
      clock: clockAt(now),
      invitations: createInvitations(found),
      tokenHasher: createTokenHasher(),
    };
  }

  it("answers valid with only the identity invitation URL for a live token", async () => {
    // arrange
    const dependencies = resolveDependencies(
      invitation({ provider: PROVIDER, emailSentAt: EARLIER }),
    );
    const useCase = new ResolveInvitationUseCase(dependencies);

    // act
    const resolution = await useCase.execute({ rawToken: RAW_TOKEN });

    // assert
    expect(resolution).toEqual({
      state: "valid",
      signUpUrl: PROVIDER.url,
    });
    expect(dependencies.tokenHasher.sha256).toHaveBeenCalledWith(RAW_TOKEN);
    expect(dependencies.invitations.findByTokenHash).toHaveBeenCalledWith(
      TOKEN_HASH,
    );
  });

  it.each([
    ["an unknown invitation", null, NOW],
    [
      "an accepted invitation",
      invitation({
        provider: PROVIDER,
        acceptedAt: NOW,
        acceptedByAuthSubjectId: "user_ana",
      }),
      NOW,
    ],
    [
      "an expired invitation",
      invitation({ provider: PROVIDER }),
      new Date("2026-10-26T10:00:00.000Z"),
    ],
    ["an invitation without an identity invitation yet", invitation(), NOW],
  ])("answers unavailable for %s", async (_label, found, now) => {
    // arrange
    const useCase = new ResolveInvitationUseCase(
      resolveDependencies(found, now),
    );

    // act
    const resolution = await useCase.execute({ rawToken: RAW_TOKEN });

    // assert
    expect(resolution).toEqual({ state: "unavailable" });
  });
});
