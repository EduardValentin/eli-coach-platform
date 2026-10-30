import { describe, expect, it, vi } from "vitest";

import { AccountInvitation } from "./account-invitation";
import type { AccountInvitationIdsPort } from "./account-invitation-ids-port";
import type { AccountInvitationIncidentsPort } from "./account-invitation-incidents-port";
import type { AccountInvitationNotificationsPort } from "./account-invitation-notifications-port";
import type { AccountInvitationsPort } from "./account-invitations-port";
import { EnsureInvitationDeliveredUseCase } from "./ensure-invitation-delivered-use-case";
import type { IdentityInvitationsPort } from "./identity-invitations-port";
import type { InvitationTokenGeneratorPort } from "./invitation-token-generator-port";
import type { InvitationTokenHasherPort } from "./invitation-token-hasher-port";
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
): AccountInvitationsPort & {
  [K in keyof AccountInvitationsPort]: ReturnType<typeof vi.fn>;
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
  } satisfies IdentityInvitationsPort;
}

function createNotifications(delivery: "sent" | "failed") {
  return {
    sendInvitation: vi.fn().mockResolvedValue(delivery),
  } satisfies AccountInvitationNotificationsPort;
}

function createIncidents() {
  return {
    invitationEmailFailed: vi.fn(),
    invitationResent: vi.fn(),
    invitationResendFailed: vi.fn(),
  } satisfies AccountInvitationIncidentsPort;
}

function createTokenGenerator(sha256: string) {
  return {
    create: vi.fn().mockReturnValue({ rawToken: RAW_TOKEN, sha256 }),
  } satisfies InvitationTokenGeneratorPort;
}

function createTokenHasher() {
  return {
    sha256: vi.fn().mockReturnValue(TOKEN_HASH),
  } satisfies InvitationTokenHasherPort;
}

function createIds() {
  return {
    generate: vi.fn().mockReturnValue("invitation-1"),
  } satisfies AccountInvitationIdsPort;
}

describe("IssueInvitationUseCase", () => {
  it("issues a thirty-day CLIENT invitation under a fresh id and stores it", async () => {
    // arrange
    const dependencies = {
      clockPort: clockAt(NOW),
      accountInvitationIdsPort: createIds(),
      accountInvitationsPort: createInvitations(null),
      invitationTokenGeneratorPort: createTokenGenerator(TOKEN_HASH),
    };
    const issueInvitationUseCase = new IssueInvitationUseCase(dependencies);

    // act
    const result = await issueInvitationUseCase.execute({ email: EMAIL });

    // assert
    expect(result).toEqual({ invitationId: "invitation-1" });
    expect(dependencies.accountInvitationsPort.insert).toHaveBeenCalledWith(
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
      clockPort: clockAt(NOW),
      identityInvitationsPort: createIdentity(),
      accountInvitationIncidentsPort: createIncidents(),
      accountInvitationsPort: createInvitations(overrides.existing),
      accountInvitationNotificationsPort: createNotifications(
        overrides.delivery ?? "sent",
      ),
      invitationTokenGeneratorPort: createTokenGenerator(NEW_TOKEN_HASH),
    };
  }

  it("reissues the token, creates the identity invitation and emails the raw token for an invitation that awaits its email", async () => {
    // arrange
    const existing = invitation();
    const dependencies = deliveryDependencies({ existing });
    const ensureInvitationDeliveredUseCase =
      new EnsureInvitationDeliveredUseCase(dependencies);

    // act
    await ensureInvitationDeliveredUseCase.execute(DELIVERY);

    // assert
    expect(dependencies.accountInvitationsPort.insert).not.toHaveBeenCalled();
    expect(dependencies.accountInvitationsPort.reissue).toHaveBeenCalledWith(
      existing.reissue({ tokenHash: NEW_TOKEN_HASH, sentAt: NOW }),
    );
    expect(dependencies.identityInvitationsPort.create).toHaveBeenCalledWith({
      email: EMAIL,
      invitationId: "invitation-1",
    });
    expect(
      dependencies.accountInvitationsPort.recordProvider,
    ).toHaveBeenCalledWith({
      invitationId: "invitation-1",
      provider: PROVIDER,
    });
    expect(
      dependencies.accountInvitationNotificationsPort.sendInvitation,
    ).toHaveBeenCalledWith({
      invitationId: "invitation-1",
      email: EMAIL,
      firstName: "Ana",
      rawToken: RAW_TOKEN,
      sentAt: NOW,
      expiresAt: new Date("2026-10-27T10:00:00.000Z"),
    });
    expect(
      dependencies.accountInvitationsPort.recordEmailSent,
    ).toHaveBeenCalledWith({
      invitationId: "invitation-1",
      at: NOW,
    });
    expect(
      dependencies.accountInvitationsPort.recordEmailDeliveryFailed,
    ).not.toHaveBeenCalled();
  });

  it("does nothing on a redelivery when the invitation, its identity invitation and its email all exist", async () => {
    // arrange
    const dependencies = deliveryDependencies({
      existing: invitation({ provider: PROVIDER, emailSentAt: EARLIER }),
    });
    const ensureInvitationDeliveredUseCase =
      new EnsureInvitationDeliveredUseCase(dependencies);

    // act
    await ensureInvitationDeliveredUseCase.execute(DELIVERY);

    // assert
    expect(
      dependencies.invitationTokenGeneratorPort.create,
    ).not.toHaveBeenCalled();
    expect(dependencies.accountInvitationsPort.reissue).not.toHaveBeenCalled();
    expect(dependencies.identityInvitationsPort.create).not.toHaveBeenCalled();
    expect(
      dependencies.accountInvitationsPort.recordProvider,
    ).not.toHaveBeenCalled();
    expect(
      dependencies.accountInvitationNotificationsPort.sendInvitation,
    ).not.toHaveBeenCalled();
  });

  it("does not resend on a redelivery after the email delivery failed", async () => {
    // arrange
    const dependencies = deliveryDependencies({
      existing: invitation({
        provider: PROVIDER,
        emailDeliveryFailedAt: EARLIER,
      }),
    });
    const ensureInvitationDeliveredUseCase =
      new EnsureInvitationDeliveredUseCase(dependencies);

    // act
    await ensureInvitationDeliveredUseCase.execute(DELIVERY);

    // assert
    expect(dependencies.accountInvitationsPort.reissue).not.toHaveBeenCalled();
    expect(
      dependencies.accountInvitationNotificationsPort.sendInvitation,
    ).not.toHaveBeenCalled();
  });

  it("keeps the identity invitation it already created when it reissues the token", async () => {
    // arrange
    const dependencies = deliveryDependencies({
      existing: invitation({ provider: PROVIDER }),
    });
    const ensureInvitationDeliveredUseCase =
      new EnsureInvitationDeliveredUseCase(dependencies);

    // act
    await ensureInvitationDeliveredUseCase.execute(DELIVERY);

    // assert
    expect(dependencies.accountInvitationsPort.reissue).toHaveBeenCalledTimes(
      1,
    );
    expect(dependencies.identityInvitationsPort.create).not.toHaveBeenCalled();
    expect(
      dependencies.accountInvitationNotificationsPort.sendInvitation,
    ).toHaveBeenCalledTimes(1);
  });

  it("delivering again after a reissue creates no second provider invitation", async () => {
    // arrange
    const reissuedByResend = invitation({ provider: PROVIDER }).reissue({
      tokenHash: NEW_TOKEN_HASH,
      sentAt: EARLIER,
    });
    const dependencies = deliveryDependencies({ existing: reissuedByResend });
    const ensureInvitationDeliveredUseCase =
      new EnsureInvitationDeliveredUseCase(dependencies);

    // act
    await ensureInvitationDeliveredUseCase.execute(DELIVERY);

    // assert
    expect(dependencies.identityInvitationsPort.create).not.toHaveBeenCalled();
    expect(dependencies.identityInvitationsPort.replace).not.toHaveBeenCalled();
    expect(
      dependencies.accountInvitationsPort.recordProvider,
    ).not.toHaveBeenCalled();
  });

  it("propagates an identity provider failure before any email is sent", async () => {
    // arrange
    const failure = new Error("Clerk unavailable");
    const dependencies = deliveryDependencies({ existing: invitation() });
    dependencies.identityInvitationsPort.create.mockRejectedValue(failure);
    const ensureInvitationDeliveredUseCase =
      new EnsureInvitationDeliveredUseCase(dependencies);

    // act
    const delivery = ensureInvitationDeliveredUseCase.execute(DELIVERY);

    // assert
    await expect(delivery).rejects.toBe(failure);
    expect(dependencies.accountInvitationsPort.reissue).toHaveBeenCalledTimes(
      1,
    );
    expect(
      dependencies.accountInvitationsPort.recordProvider,
    ).not.toHaveBeenCalled();
    expect(
      dependencies.accountInvitationNotificationsPort.sendInvitation,
    ).not.toHaveBeenCalled();
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
      dependencies.accountInvitationNotificationsPort.sendInvitation =
        sendInvitation();
      const ensureInvitationDeliveredUseCase =
        new EnsureInvitationDeliveredUseCase(dependencies);

      // act
      await ensureInvitationDeliveredUseCase.execute(DELIVERY);

      // assert
      expect(
        dependencies.accountInvitationsPort.recordEmailDeliveryFailed,
      ).toHaveBeenCalledWith({ invitationId: "invitation-1", at: NOW });
      expect(
        dependencies.accountInvitationIncidentsPort.invitationEmailFailed,
      ).toHaveBeenCalledWith({ invitationId: "invitation-1" });
      expect(
        dependencies.accountInvitationsPort.recordEmailSent,
      ).not.toHaveBeenCalled();
    },
  );

  it("refuses to deliver an invitation that does not exist", async () => {
    // arrange
    const dependencies = deliveryDependencies({ existing: null });
    const ensureInvitationDeliveredUseCase =
      new EnsureInvitationDeliveredUseCase(dependencies);

    // act
    const delivery = ensureInvitationDeliveredUseCase.execute({
      invitationId: "invitation-404",
      firstName: "Ana",
    });

    // assert
    await expect(delivery).rejects.toThrow("invitation-404");
    expect(dependencies.accountInvitationsPort.reissue).not.toHaveBeenCalled();
  });
});

describe("ResolveInvitationUseCase", () => {
  function resolveDependencies(found: AccountInvitation | null, now = NOW) {
    return {
      clockPort: clockAt(now),
      accountInvitationsPort: createInvitations(found),
      invitationTokenHasherPort: createTokenHasher(),
    };
  }

  it("answers valid with only the identity invitation URL for a live token", async () => {
    // arrange
    const dependencies = resolveDependencies(
      invitation({ provider: PROVIDER, emailSentAt: EARLIER }),
    );
    const resolveInvitationUseCase = new ResolveInvitationUseCase(dependencies);

    // act
    const resolution = await resolveInvitationUseCase.execute({
      rawToken: RAW_TOKEN,
    });

    // assert
    expect(resolution).toEqual({
      state: "valid",
      signUpUrl: PROVIDER.url,
    });
    expect(dependencies.invitationTokenHasherPort.sha256).toHaveBeenCalledWith(
      RAW_TOKEN,
    );
    expect(
      dependencies.accountInvitationsPort.findByTokenHash,
    ).toHaveBeenCalledWith(TOKEN_HASH);
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
    const resolveInvitationUseCase = new ResolveInvitationUseCase(
      resolveDependencies(found, now),
    );

    // act
    const resolution = await resolveInvitationUseCase.execute({
      rawToken: RAW_TOKEN,
    });

    // assert
    expect(resolution).toEqual({ state: "unavailable" });
  });
});
