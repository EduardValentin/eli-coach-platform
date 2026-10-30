import type { IdentityInvitationsPort } from "~/bounded-contexts/access/accounts/domain/account";
import { describe, expect, it } from "vitest";

import { InMemoryIdentityInvitationsAdapter } from "./in-memory-identity-invitations-adapter.server";

describe("InMemoryIdentityInvitations", () => {
  it("hands out a numbered invitation whose URL is the sign-up page with a stand-in ticket", async () => {
    // arrange
    const identityInvitationsPort: IdentityInvitationsPort =
      new InMemoryIdentityInvitationsAdapter({
        signUpUrl: "https://accounts.evoa.example/sign-up",
      });

    // act
    const first = await identityInvitationsPort.create({
      email: "ana@example.com",
      invitationId: "invitation-1",
    });
    const second = await identityInvitationsPort.create({
      email: "maria@example.com",
      invitationId: "invitation-2",
    });

    // assert
    expect(first).toEqual({
      id: "inv_memory_1",
      url: "https://accounts.evoa.example/sign-up?__clerk_ticket=memory",
    });
    expect(second.id).toBe("inv_memory_2");
  });

  it("replaces an invitation with the next numbered one", async () => {
    // arrange
    const identityInvitationsPort: IdentityInvitationsPort =
      new InMemoryIdentityInvitationsAdapter({
        signUpUrl: "https://accounts.evoa.example/sign-up",
      });
    const previous = await identityInvitationsPort.create({
      email: "ana@example.com",
      invitationId: "invitation-1",
    });

    // act
    const replacement = await identityInvitationsPort.replace({
      email: "ana@example.com",
      invitationId: "invitation-1",
      previous,
    });

    // assert
    expect(replacement).toEqual({
      id: "inv_memory_2",
      url: "https://accounts.evoa.example/sign-up?__clerk_ticket=memory",
    });
  });
});
