import { describe, expect, it, vi } from "vitest";

import { ClerkInvitationReferencesAdapter } from "./clerk-invitation-references-adapter.server";

describe("ClerkInvitationReferencesAdapter#invitationIdOf", () => {
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
    const client = { users: { getUser: vi.fn() } };
    client.users.getUser.mockResolvedValue({ publicMetadata });
    const clerkInvitationReferencesAdapter =
      new ClerkInvitationReferencesAdapter(client);

    // act
    const invitationId =
      await clerkInvitationReferencesAdapter.invitationIdOf("user_ana");

    // assert
    expect(invitationId).toBe(expected);
    expect(client.users.getUser).toHaveBeenCalledWith("user_ana");
  });
});
