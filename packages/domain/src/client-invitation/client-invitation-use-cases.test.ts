import { describe, expect, it, vi } from "vitest";

import { AcceptInvitationUseCase } from "./accept-invitation-use-case";
import { AdmitPaidClientUseCase } from "./admit-paid-client-use-case";
import { ClientInvitation } from "./client-invitation";
import type { ClientInvitationIncidents } from "./client-invitation-incidents";
import type { ClientInvitationNotifications } from "./client-invitation-notifications";
import type {
  ClientInvitationIdGenerator,
  ClientInvitations,
} from "./client-invitations";
import type { IdentityInvitations } from "./identity-invitations";
import type {
  InvitationTokenGenerator,
  InvitationTokenHasher,
} from "./invitation-token";
import type { InvitedClient, InvitedClients } from "./invited-client";
import { ResolveInvitationUseCase } from "./resolve-invitation-use-case";

const NOW = new Date("2026-09-27T10:00:00.000Z");
const EARLIER = new Date("2026-09-26T10:00:00.000Z");
const RAW_TOKEN = "raw-invitation-token";
const TOKEN_HASH = "c".repeat(64);
const NEW_TOKEN_HASH = "d".repeat(64);
const PROVIDER = {
  id: "inv_clerk_1",
  url: "https://accounts.example/sign-up?__clerk_ticket=ticket",
};

const invitedClient: InvitedClient = {
  id: "client-1",
  email: "ana@example.com",
  firstName: "Ana",
  authSubjectId: null,
};

function clockAt(now: Date) {
  return { now: () => now };
}

function invitation(
  overrides: Partial<Parameters<typeof ClientInvitation.reconstitute>[0]> = {},
): ClientInvitation {
  return ClientInvitation.reconstitute({
    ...ClientInvitation.issue({
      id: "invitation-1",
      clientId: invitedClient.id,
      email: invitedClient.email,
      tokenHash: TOKEN_HASH,
      sentAt: EARLIER,
    }),
    ...overrides,
  });
}

function createInvitations(
  found: ClientInvitation | null,
): ClientInvitations & {
  [K in keyof ClientInvitations]: ReturnType<typeof vi.fn>;
} {
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
  };
}

function createIdentity(invitationIdForSubject: string | null = null) {
  return {
    create: vi.fn().mockResolvedValue(PROVIDER),
    findInvitationIdForSubject: vi
      .fn()
      .mockResolvedValue(invitationIdForSubject),
  } satisfies IdentityInvitations;
}

function createNotifications(delivery: "sent" | "failed") {
  return {
    sendInvitation: vi.fn().mockResolvedValue(delivery),
  } satisfies ClientInvitationNotifications;
}

function createIncidents() {
  return { invitationEmailFailed: vi.fn() } satisfies ClientInvitationIncidents;
}

function createInvitedClients(found: InvitedClient | null) {
  return {
    findById: vi.fn().mockResolvedValue(found),
  } satisfies InvitedClients;
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
  } satisfies ClientInvitationIdGenerator;
}

function admitDependencies(overrides: {
  clients?: InvitedClient | null;
  existing?: ClientInvitation | null;
  delivery?: "sent" | "failed";
}) {
  return {
    clients: createInvitedClients(
      overrides.clients === undefined ? invitedClient : overrides.clients,
    ),
    clock: clockAt(NOW),
    identity: createIdentity(),
    incidents: createIncidents(),
    invitationIds: createIds(),
    invitations: createInvitations(overrides.existing ?? null),
    notifications: createNotifications(overrides.delivery ?? "sent"),
    tokenGenerator: createTokenGenerator(
      overrides.existing ? NEW_TOKEN_HASH : TOKEN_HASH,
    ),
  };
}

describe("AdmitPaidClientUseCase", () => {
  it("issues the invitation, creates the identity invitation and emails the raw token for a client without one", async () => {
    // arrange
    const dependencies = admitDependencies({});
    const useCase = new AdmitPaidClientUseCase(dependencies);

    // act
    const result = await useCase.execute({ clientId: invitedClient.id });

    // assert
    expect(result).toEqual({ status: "invited" });
    expect(dependencies.invitations.insert).toHaveBeenCalledWith(
      ClientInvitation.issue({
        id: "invitation-1",
        clientId: invitedClient.id,
        email: invitedClient.email,
        tokenHash: TOKEN_HASH,
        sentAt: NOW,
      }),
    );
    expect(dependencies.identity.create).toHaveBeenCalledWith({
      email: invitedClient.email,
      invitationId: "invitation-1",
    });
    expect(dependencies.invitations.recordProvider).toHaveBeenCalledWith({
      invitationId: "invitation-1",
      provider: PROVIDER,
    });
    expect(dependencies.notifications.sendInvitation).toHaveBeenCalledWith({
      invitationId: "invitation-1",
      email: invitedClient.email,
      firstName: invitedClient.firstName,
      rawToken: RAW_TOKEN,
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

  it("does nothing for a client already bound to an account", async () => {
    // arrange
    const dependencies = admitDependencies({
      clients: { ...invitedClient, authSubjectId: "user_ana" },
    });
    const useCase = new AdmitPaidClientUseCase(dependencies);

    // act
    const result = await useCase.execute({ clientId: invitedClient.id });

    // assert
    expect(result).toEqual({ status: "already-admitted" });
    expect(dependencies.invitations.findByClientId).not.toHaveBeenCalled();
    expect(dependencies.identity.create).not.toHaveBeenCalled();
    expect(dependencies.notifications.sendInvitation).not.toHaveBeenCalled();
  });

  it("does nothing on a redelivery when the invitation, its identity invitation and its email all exist", async () => {
    // arrange
    const dependencies = admitDependencies({
      existing: invitation({ provider: PROVIDER, emailSentAt: EARLIER }),
    });
    const useCase = new AdmitPaidClientUseCase(dependencies);

    // act
    const result = await useCase.execute({ clientId: invitedClient.id });

    // assert
    expect(result).toEqual({ status: "invited" });
    expect(dependencies.tokenGenerator.create).not.toHaveBeenCalled();
    expect(dependencies.invitations.insert).not.toHaveBeenCalled();
    expect(dependencies.invitations.reissue).not.toHaveBeenCalled();
    expect(dependencies.identity.create).not.toHaveBeenCalled();
    expect(dependencies.invitations.recordProvider).not.toHaveBeenCalled();
    expect(dependencies.notifications.sendInvitation).not.toHaveBeenCalled();
  });

  it("does not resend on a redelivery after the email delivery failed", async () => {
    // arrange
    const dependencies = admitDependencies({
      existing: invitation({
        provider: PROVIDER,
        emailDeliveryFailedAt: EARLIER,
      }),
    });
    const useCase = new AdmitPaidClientUseCase(dependencies);

    // act
    const result = await useCase.execute({ clientId: invitedClient.id });

    // assert
    expect(result).toEqual({ status: "invited" });
    expect(dependencies.invitations.reissue).not.toHaveBeenCalled();
    expect(dependencies.notifications.sendInvitation).not.toHaveBeenCalled();
  });

  it("reissues the token and completes the missing steps when an earlier delivery stopped before the email", async () => {
    // arrange
    const existing = invitation();
    const dependencies = admitDependencies({ existing });
    const useCase = new AdmitPaidClientUseCase(dependencies);

    // act
    const result = await useCase.execute({ clientId: invitedClient.id });

    // assert
    expect(result).toEqual({ status: "invited" });
    expect(dependencies.invitations.insert).not.toHaveBeenCalled();
    expect(dependencies.invitations.reissue).toHaveBeenCalledWith(
      existing.reissue({ tokenHash: NEW_TOKEN_HASH, sentAt: NOW }),
    );
    expect(dependencies.identity.create).toHaveBeenCalledWith({
      email: invitedClient.email,
      invitationId: "invitation-1",
    });
    expect(dependencies.notifications.sendInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        rawToken: RAW_TOKEN,
        expiresAt: new Date("2026-10-27T10:00:00.000Z"),
      }),
    );
  });

  it("keeps the identity invitation it already created when it reissues the token", async () => {
    // arrange
    const dependencies = admitDependencies({
      existing: invitation({ provider: PROVIDER }),
    });
    const useCase = new AdmitPaidClientUseCase(dependencies);

    // act
    await useCase.execute({ clientId: invitedClient.id });

    // assert
    expect(dependencies.invitations.reissue).toHaveBeenCalledTimes(1);
    expect(dependencies.identity.create).not.toHaveBeenCalled();
    expect(dependencies.notifications.sendInvitation).toHaveBeenCalledTimes(1);
  });

  it("propagates an identity provider failure before any email is sent", async () => {
    // arrange
    const failure = new Error("Clerk unavailable");
    const dependencies = admitDependencies({});
    dependencies.identity.create.mockRejectedValue(failure);
    const useCase = new AdmitPaidClientUseCase(dependencies);

    // act
    const admission = useCase.execute({ clientId: invitedClient.id });

    // assert
    await expect(admission).rejects.toBe(failure);
    expect(dependencies.invitations.insert).toHaveBeenCalledTimes(1);
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
      const dependencies = admitDependencies({});
      dependencies.notifications.sendInvitation = sendInvitation();
      const useCase = new AdmitPaidClientUseCase(dependencies);

      // act
      const result = await useCase.execute({ clientId: invitedClient.id });

      // assert
      expect(result).toEqual({ status: "invited" });
      expect(
        dependencies.invitations.recordEmailDeliveryFailed,
      ).toHaveBeenCalledWith({ invitationId: "invitation-1", at: NOW });
      expect(dependencies.incidents.invitationEmailFailed).toHaveBeenCalledWith(
        { invitationId: "invitation-1" },
      );
      expect(dependencies.invitations.recordEmailSent).not.toHaveBeenCalled();
    },
  );

  it("refuses to admit a client that does not exist", async () => {
    // arrange
    const dependencies = admitDependencies({ clients: null });
    const useCase = new AdmitPaidClientUseCase(dependencies);

    // act
    const admission = useCase.execute({ clientId: "client-404" });

    // assert
    await expect(admission).rejects.toThrow("client-404");
    expect(dependencies.invitations.insert).not.toHaveBeenCalled();
  });
});

describe("ResolveInvitationUseCase", () => {
  function resolveDependencies(found: ClientInvitation | null, now = NOW) {
    return {
      clock: clockAt(now),
      invitations: createInvitations(found),
      tokenHasher: createTokenHasher(),
    };
  }

  it("answers valid with the email and the identity invitation URL for a live token", async () => {
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
      email: invitedClient.email,
      continueUrl: PROVIDER.url,
    });
    expect(dependencies.tokenHasher.sha256).toHaveBeenCalledWith(RAW_TOKEN);
    expect(dependencies.invitations.findByTokenHash).toHaveBeenCalledWith(
      TOKEN_HASH,
    );
  });

  it.each([
    ["an unknown invitation", null, NOW],
    [
      "a used invitation",
      invitation({
        provider: PROVIDER,
        usedAt: NOW,
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

describe("AcceptInvitationUseCase", () => {
  function acceptDependencies(options: {
    invitationIdForSubject?: string | null;
    found: ClientInvitation | null;
    now?: Date;
  }) {
    return {
      clock: clockAt(options.now ?? NOW),
      identity: createIdentity(
        options.invitationIdForSubject === undefined
          ? "invitation-1"
          : options.invitationIdForSubject,
      ),
      invitations: createInvitations(options.found),
    };
  }

  it("accepts a pending invitation for the subject that carries it", async () => {
    // arrange
    const dependencies = acceptDependencies({
      found: invitation({ provider: PROVIDER }),
    });
    const useCase = new AcceptInvitationUseCase(dependencies);

    // act
    const outcome = await useCase.execute({ authSubjectId: "user_ana" });

    // assert
    expect(outcome).toBe("accepted");
    expect(
      dependencies.identity.findInvitationIdForSubject,
    ).toHaveBeenCalledWith("user_ana");
    expect(dependencies.invitations.findById).toHaveBeenCalledWith(
      "invitation-1",
    );
    expect(dependencies.invitations.accept).toHaveBeenCalledWith({
      invitationId: "invitation-1",
      authSubjectId: "user_ana",
      now: NOW,
    });
  });

  it("refuses a subject that carries no invitation", async () => {
    // arrange
    const dependencies = acceptDependencies({
      invitationIdForSubject: null,
      found: invitation(),
    });
    const useCase = new AcceptInvitationUseCase(dependencies);

    // act
    const outcome = await useCase.execute({ authSubjectId: "user_stranger" });

    // assert
    expect(outcome).toBe("refused");
    expect(dependencies.invitations.findById).not.toHaveBeenCalled();
    expect(dependencies.invitations.accept).not.toHaveBeenCalled();
  });

  it("refuses a subject whose invitation id matches no invitation", async () => {
    // arrange
    const dependencies = acceptDependencies({ found: null });
    const useCase = new AcceptInvitationUseCase(dependencies);

    // act
    const outcome = await useCase.execute({ authSubjectId: "user_ana" });

    // assert
    expect(outcome).toBe("refused");
    expect(dependencies.invitations.accept).not.toHaveBeenCalled();
  });

  it("refuses an expired invitation that was never used", async () => {
    // arrange
    const dependencies = acceptDependencies({
      found: invitation({ provider: PROVIDER }),
      now: new Date("2026-10-26T10:00:00.000Z"),
    });
    const useCase = new AcceptInvitationUseCase(dependencies);

    // act
    const outcome = await useCase.execute({ authSubjectId: "user_ana" });

    // assert
    expect(outcome).toBe("refused");
    expect(dependencies.invitations.accept).not.toHaveBeenCalled();
  });

  it("accepts again without writing when the same subject replays an invitation it accepted", async () => {
    // arrange
    const dependencies = acceptDependencies({
      found: invitation({
        provider: PROVIDER,
        usedAt: EARLIER,
        acceptedByAuthSubjectId: "user_ana",
      }),
      now: new Date("2026-11-30T10:00:00.000Z"),
    });
    const useCase = new AcceptInvitationUseCase(dependencies);

    // act
    const outcome = await useCase.execute({ authSubjectId: "user_ana" });

    // assert
    expect(outcome).toBe("accepted");
    expect(dependencies.invitations.accept).not.toHaveBeenCalled();
  });

  it("refuses a second subject presenting an invitation another subject accepted", async () => {
    // arrange
    const dependencies = acceptDependencies({
      found: invitation({
        provider: PROVIDER,
        usedAt: EARLIER,
        acceptedByAuthSubjectId: "user_ana",
      }),
    });
    const useCase = new AcceptInvitationUseCase(dependencies);

    // act
    const outcome = await useCase.execute({ authSubjectId: "user_other" });

    // assert
    expect(outcome).toBe("refused");
    expect(dependencies.invitations.accept).not.toHaveBeenCalled();
  });

  it.each([
    ["accepts when the winning write was its own", "user_ana", "accepted"],
    ["refuses when another subject won the write", "user_other", "refused"],
  ] as const)(
    "re-reads after losing the race and %s",
    async (_label, winner, expected) => {
      // arrange
      const dependencies = acceptDependencies({
        found: invitation({ provider: PROVIDER }),
      });
      dependencies.invitations.accept.mockResolvedValue("raced");
      dependencies.invitations.findById
        .mockResolvedValueOnce(invitation({ provider: PROVIDER }))
        .mockResolvedValueOnce(
          invitation({
            provider: PROVIDER,
            usedAt: NOW,
            acceptedByAuthSubjectId: winner,
          }),
        );
      const useCase = new AcceptInvitationUseCase(dependencies);

      // act
      const outcome = await useCase.execute({ authSubjectId: "user_ana" });

      // assert
      expect(outcome).toBe(expected);
      expect(dependencies.invitations.findById).toHaveBeenCalledTimes(2);
    },
  );
});
