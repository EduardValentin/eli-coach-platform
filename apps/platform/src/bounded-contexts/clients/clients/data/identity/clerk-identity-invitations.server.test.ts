import { describe, expect, it, vi } from "vitest";

import { ClerkIdentityInvitations } from "./clerk-identity-invitations.server";

const SIGN_UP_URL = "https://accounts.evoa.example/sign-up";
const RETURN_URL = "https://evoa.example/eli-coach-platform/client";

function createClerkClient() {
  return {
    invitations: {
      createInvitation: vi.fn().mockResolvedValue({
        id: "inv_clerk_1",
        url: "https://accounts.evoa.example/sign-up?__clerk_ticket=ticket",
      }),
      revokeInvitation: vi
        .fn()
        .mockResolvedValue({ id: "inv_clerk_0", status: "revoked" }),
    },
    users: {
      getUser: vi.fn().mockResolvedValue({ publicMetadata: {} }),
    },
  };
}

function createAdapter(client = createClerkClient()) {
  return {
    client,
    identity: new ClerkIdentityInvitations(client, {
      signUpUrl: SIGN_UP_URL,
      returnUrl: RETURN_URL,
    }),
  };
}

describe("ClerkIdentityInvitations#create", () => {
  it("creates a silent thirty-day invitation that carries our invitation id, is created even when one is already pending for the email, and returns through the hosted sign-up to our portal", async () => {
    // arrange
    const { client, identity } = createAdapter();

    // act
    const invitation = await identity.create({
      email: "ana@example.com",
      invitationId: "invitation-1",
    });

    // assert
    expect(invitation).toEqual({
      id: "inv_clerk_1",
      url: "https://accounts.evoa.example/sign-up?__clerk_ticket=ticket",
    });
    expect(client.invitations.createInvitation).toHaveBeenCalledWith({
      emailAddress: "ana@example.com",
      ignoreExisting: true,
      notify: false,
      expiresInDays: 30,
      publicMetadata: { invitationId: "invitation-1" },
      redirectUrl:
        "https://accounts.evoa.example/sign-up?redirect_url=https%3A%2F%2Fevoa.example%2Feli-coach-platform%2Fclient",
    });
  });

  it("refuses an invitation Clerk answers without a URL", async () => {
    // arrange
    const client = createClerkClient();
    client.invitations.createInvitation.mockResolvedValue({
      id: "inv_clerk_1",
    });
    const { identity } = createAdapter(client);

    // act
    const creation = identity.create({
      email: "ana@example.com",
      invitationId: "invitation-1",
    });

    // assert
    await expect(creation).rejects.toThrow("inv_clerk_1");
  });

  it("reports a Clerk failure by our invitation id and Clerk's status, never by Clerk's message, which may name the email", async () => {
    // arrange
    const client = createClerkClient();
    client.invitations.createInvitation.mockRejectedValue(
      Object.assign(new Error("ana@example.com already has a pending invite"), {
        status: 422,
      }),
    );
    const { identity } = createAdapter(client);

    // act
    const creation = identity.create({
      email: "ana@example.com",
      invitationId: "invitation-1",
    });

    // assert
    await expect(creation).rejects.toThrow(
      "Clerk did not create the identity invitation for invitation-1 (status 422).",
    );
    await expect(creation).rejects.not.toHaveProperty("cause");
  });

  it("reports a Clerk failure without a status as unknown", async () => {
    // arrange
    const client = createClerkClient();
    client.invitations.createInvitation.mockRejectedValue(
      new Error("socket hang up"),
    );
    const { identity } = createAdapter(client);

    // act
    const creation = identity.create({
      email: "ana@example.com",
      invitationId: "invitation-1",
    });

    // assert
    await expect(creation).rejects.toThrow(
      "Clerk did not create the identity invitation for invitation-1 (status unknown).",
    );
  });
});

const PREVIOUS = {
  id: "inv_clerk_0",
  url: "https://accounts.evoa.example/sign-up?__clerk_ticket=earlier",
};

function clerkRefusal(status: number, code: string) {
  return Object.assign(new Error("ana@example.com cannot be revoked"), {
    status,
    errors: [{ code, message: "refused" }],
  });
}

describe("ClerkIdentityInvitations#replace", () => {
  it("revokes the earlier invitation before it creates the fresh one", async () => {
    // arrange
    const { client, identity } = createAdapter();

    // act
    const invitation = await identity.replace({
      email: "ana@example.com",
      invitationId: "invitation-1",
      previous: PREVIOUS,
    });

    // assert
    expect(invitation).toEqual({
      id: "inv_clerk_1",
      url: "https://accounts.evoa.example/sign-up?__clerk_ticket=ticket",
    });
    expect(client.invitations.revokeInvitation).toHaveBeenCalledWith(
      "inv_clerk_0",
    );
    expect(client.invitations.createInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        emailAddress: "ana@example.com",
        publicMetadata: { invitationId: "invitation-1" },
      }),
    );
    expect(
      client.invitations.revokeInvitation.mock.invocationCallOrder[0],
    ).toBeLessThan(
      client.invitations.createInvitation.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it.each([
    ["Clerk no longer knows it", clerkRefusal(404, "resource_not_found")],
    ["it is already revoked", clerkRefusal(400, "invitation_already_revoked")],
    [
      "Clerk words the revoked state the older way",
      clerkRefusal(400, "invitation_revoked"),
    ],
    [
      "it is no longer pending",
      clerkRefusal(400, "invitation_cannot_be_revoked_code"),
    ],
  ])(
    "creates the fresh invitation when the earlier one cannot be revoked because %s",
    async (_label, refusal) => {
      // arrange
      const client = createClerkClient();
      client.invitations.revokeInvitation.mockRejectedValue(refusal);
      const { identity } = createAdapter(client);

      // act
      const invitation = await identity.replace({
        email: "ana@example.com",
        invitationId: "invitation-1",
        previous: PREVIOUS,
      });

      // assert
      expect(invitation.id).toBe("inv_clerk_1");
    },
  );

  it.each([
    ["an unavailable Clerk", clerkRefusal(500, "internal_clerk_error"), "500"],
    [
      "an unexplained bad request",
      clerkRefusal(400, "form_param_missing"),
      "400",
    ],
    ["a network failure", new Error("socket hang up"), "unknown"],
  ])(
    "creates nothing and reports %s by the earlier invitation and Clerk's status",
    async (_label, refusal, status) => {
      // arrange
      const client = createClerkClient();
      client.invitations.revokeInvitation.mockRejectedValue(refusal);
      const { identity } = createAdapter(client);

      // act
      const replacement = identity.replace({
        email: "ana@example.com",
        invitationId: "invitation-1",
        previous: PREVIOUS,
      });

      // assert
      await expect(replacement).rejects.toThrow(
        `Clerk did not revoke the identity invitation inv_clerk_0 for invitation-1 (status ${status}).`,
      );
      await expect(replacement).rejects.not.toHaveProperty("cause");
      expect(client.invitations.createInvitation).not.toHaveBeenCalled();
    },
  );

  it("reports a failed creation after the revoke the way a creation does", async () => {
    // arrange
    const client = createClerkClient();
    client.invitations.createInvitation.mockRejectedValue(
      Object.assign(new Error("boom"), { status: 503 }),
    );
    const { identity } = createAdapter(client);

    // act
    const replacement = identity.replace({
      email: "ana@example.com",
      invitationId: "invitation-1",
      previous: PREVIOUS,
    });

    // assert
    await expect(replacement).rejects.toThrow(
      "Clerk did not create the identity invitation for invitation-1 (status 503).",
    );
  });
});

describe("ClerkIdentityInvitations#findInvitationIdForSubject", () => {
  it.each([
    [
      "the invitation id its public metadata carries",
      { invitationId: "invitation-1" },
      "invitation-1",
    ],
    ["nothing when its public metadata carries no invitation", {}, null],
    [
      "nothing when the invitation id is not a string",
      { invitationId: 42 },
      null,
    ],
  ])("answers %s", async (_label, publicMetadata, expected) => {
    // arrange
    const client = createClerkClient();
    client.users.getUser.mockResolvedValue({ publicMetadata });
    const { identity } = createAdapter(client);

    // act
    const invitationId = await identity.findInvitationIdForSubject("user_ana");

    // assert
    expect(invitationId).toBe(expected);
    expect(client.users.getUser).toHaveBeenCalledWith("user_ana");
  });
});
