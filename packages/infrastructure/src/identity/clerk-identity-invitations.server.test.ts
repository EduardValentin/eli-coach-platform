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
  it("creates a silent thirty-day invitation that carries our invitation id and returns through the hosted sign-up to our portal", async () => {
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

  it("propagates a Clerk failure", async () => {
    // arrange
    const failure = new Error("Clerk unavailable");
    const client = createClerkClient();
    client.invitations.createInvitation.mockRejectedValue(failure);
    const { identity } = createAdapter(client);

    // act
    const creation = identity.create({
      email: "ana@example.com",
      invitationId: "invitation-1",
    });

    // assert
    await expect(creation).rejects.toBe(failure);
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
