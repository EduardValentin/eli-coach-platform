import { describe, expect, it, vi } from "vitest";

import { AcceptInvitationUseCase } from "./accept-invitation-use-case";
import type { AccountInvitationsPort } from "./account-invitations-port";
import type { InvitedClient, InvitedClientsPort } from "./invited-clients-port";
import { InvitePaidClientUseCase } from "./invite-paid-client-use-case";

const invitedClient: InvitedClient = {
  id: "client-1",
  email: "ana@example.com",
  firstName: "Ana",
  authSubjectId: null,
  accountInvitationId: null,
  coachingCancelledOrEnded: false,
};

function createAccountInvitations(acceptedInvitationId: string | null = null) {
  return {
    issue: vi.fn().mockResolvedValue({ invitationId: "invitation-1" }),
    ensureDelivered: vi.fn().mockResolvedValue(undefined),
    resend: vi.fn().mockResolvedValue({ status: "not-found" }),
    standingOf: vi.fn().mockResolvedValue(null),
    acceptedInvitationOf: vi.fn().mockResolvedValue(acceptedInvitationId),
  } satisfies AccountInvitationsPort;
}

function createInvitedClients(found: InvitedClient | null) {
  return {
    findById: vi.fn().mockResolvedValue(found),
    findByAccountInvitationId: vi.fn().mockResolvedValue(found),
    recordAccountInvitation: vi.fn().mockResolvedValue(undefined),
    bindAuthSubject: vi.fn().mockResolvedValue("bound"),
  } satisfies InvitedClientsPort;
}

describe("InvitePaidClientUseCase", () => {
  function inviteDependencies(client: InvitedClient | null) {
    return {
      accountInvitations: createAccountInvitations(),
      clients: createInvitedClients(client),
    };
  }

  it("issues an account invitation for a client without one, records it on her and delivers it", async () => {
    // arrange
    const dependencies = inviteDependencies(invitedClient);
    const useCase = new InvitePaidClientUseCase(dependencies);

    // act
    const result = await useCase.execute({ clientId: invitedClient.id });

    // assert
    expect(result).toEqual({ status: "invited" });
    expect(dependencies.accountInvitations.issue).toHaveBeenCalledWith({
      email: invitedClient.email,
    });
    expect(dependencies.clients.recordAccountInvitation).toHaveBeenCalledWith({
      clientId: invitedClient.id,
      invitationId: "invitation-1",
    });
    expect(
      dependencies.accountInvitations.ensureDelivered,
    ).toHaveBeenCalledWith({
      invitationId: "invitation-1",
      firstName: invitedClient.firstName,
    });
    const order = [
      dependencies.accountInvitations.issue,
      dependencies.clients.recordAccountInvitation,
      dependencies.accountInvitations.ensureDelivered,
    ].map((step) => step.mock.invocationCallOrder[0]);
    expect(order).toEqual([...order].sort((left, right) => left - right));
  });

  it("delivers the invitation she already holds without issuing another", async () => {
    // arrange
    const dependencies = inviteDependencies({
      ...invitedClient,
      accountInvitationId: "invitation-1",
    });
    const useCase = new InvitePaidClientUseCase(dependencies);

    // act
    const result = await useCase.execute({ clientId: invitedClient.id });

    // assert
    expect(result).toEqual({ status: "invited" });
    expect(dependencies.accountInvitations.issue).not.toHaveBeenCalled();
    expect(dependencies.clients.recordAccountInvitation).not.toHaveBeenCalled();
    expect(
      dependencies.accountInvitations.ensureDelivered,
    ).toHaveBeenCalledWith({
      invitationId: "invitation-1",
      firstName: invitedClient.firstName,
    });
  });

  it("does nothing for a client already bound to an account", async () => {
    // arrange
    const dependencies = inviteDependencies({
      ...invitedClient,
      authSubjectId: "user_ana",
    });
    const useCase = new InvitePaidClientUseCase(dependencies);

    // act
    const result = await useCase.execute({ clientId: invitedClient.id });

    // assert
    expect(result).toEqual({ status: "already-admitted" });
    expect(dependencies.accountInvitations.issue).not.toHaveBeenCalled();
    expect(
      dependencies.accountInvitations.ensureDelivered,
    ).not.toHaveBeenCalled();
  });

  it("refuses to invite a client that does not exist", async () => {
    // arrange
    const dependencies = inviteDependencies(null);
    const useCase = new InvitePaidClientUseCase(dependencies);

    // act
    const admission = useCase.execute({ clientId: "client-404" });

    // assert
    await expect(admission).rejects.toThrow("client-404");
    expect(dependencies.accountInvitations.issue).not.toHaveBeenCalled();
  });
});

describe("AcceptInvitationUseCase", () => {
  function acceptDependencies(options: {
    acceptedInvitationId?: string | null;
    found: InvitedClient | null;
  }) {
    return {
      accountInvitations: createAccountInvitations(
        options.acceptedInvitationId === undefined
          ? "invitation-1"
          : options.acceptedInvitationId,
      ),
      clients: createInvitedClients(options.found),
    };
  }

  const heldInvitation = {
    ...invitedClient,
    accountInvitationId: "invitation-1",
  };

  it("links the client of the invitation the signed-in subject accepted", async () => {
    // arrange
    const dependencies = acceptDependencies({ found: heldInvitation });
    const useCase = new AcceptInvitationUseCase(dependencies);

    // act
    const outcome = await useCase.execute({ authSubjectId: "user_ana" });

    // assert
    expect(outcome).toBe("accepted");
    expect(
      dependencies.accountInvitations.acceptedInvitationOf,
    ).toHaveBeenCalledWith("user_ana");
    expect(dependencies.clients.findByAccountInvitationId).toHaveBeenCalledWith(
      "invitation-1",
    );
    expect(dependencies.clients.bindAuthSubject).toHaveBeenCalledWith({
      clientId: "client-1",
      authSubjectId: "user_ana",
    });
  });

  it("refuses a subject that accepted no invitation", async () => {
    // arrange
    const dependencies = acceptDependencies({
      acceptedInvitationId: null,
      found: heldInvitation,
    });
    const useCase = new AcceptInvitationUseCase(dependencies);

    // act
    const outcome = await useCase.execute({ authSubjectId: "user_stranger" });

    // assert
    expect(outcome).toBe("refused");
    expect(
      dependencies.clients.findByAccountInvitationId,
    ).not.toHaveBeenCalled();
    expect(dependencies.clients.bindAuthSubject).not.toHaveBeenCalled();
  });

  it("refuses a subject whose accepted invitation no client references", async () => {
    // arrange
    const dependencies = acceptDependencies({ found: null });
    const useCase = new AcceptInvitationUseCase(dependencies);

    // act
    const outcome = await useCase.execute({ authSubjectId: "user_ana" });

    // assert
    expect(outcome).toBe("refused");
    expect(dependencies.clients.bindAuthSubject).not.toHaveBeenCalled();
  });

  it("accepts again without writing when the client is already linked to the subject", async () => {
    // arrange
    const dependencies = acceptDependencies({
      found: { ...heldInvitation, authSubjectId: "user_ana" },
    });
    const useCase = new AcceptInvitationUseCase(dependencies);

    // act
    const outcome = await useCase.execute({ authSubjectId: "user_ana" });

    // assert
    expect(outcome).toBe("accepted");
    expect(dependencies.clients.bindAuthSubject).not.toHaveBeenCalled();
  });

  it.each([
    ["accepts when the winning write was its own", "user_ana", "accepted"],
    ["refuses when another subject won the write", "user_other", "refused"],
  ] as const)(
    "re-reads after losing the race and %s",
    async (_label, winner, expected) => {
      // arrange
      const dependencies = acceptDependencies({ found: heldInvitation });
      dependencies.clients.bindAuthSubject.mockResolvedValue("raced");
      dependencies.clients.findById.mockResolvedValue({
        ...heldInvitation,
        authSubjectId: winner,
      });
      const useCase = new AcceptInvitationUseCase(dependencies);

      // act
      const outcome = await useCase.execute({ authSubjectId: "user_ana" });

      // assert
      expect(outcome).toBe(expected);
      expect(dependencies.clients.findById).toHaveBeenCalledWith("client-1");
    },
  );
});
