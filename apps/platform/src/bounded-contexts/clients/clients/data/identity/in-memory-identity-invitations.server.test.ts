import type { IdentityInvitations } from "@eli-coach-platform/domain/client-invitation";
import { describe, expect, it } from "vitest";

import { InMemoryIdentityInvitations } from "./in-memory-identity-invitations.server";

describe("InMemoryIdentityInvitations", () => {
  it("hands out a numbered invitation whose URL is the sign-up page with a stand-in ticket", async () => {
    // arrange
    const identity: IdentityInvitations = new InMemoryIdentityInvitations({
      signUpUrl: "https://accounts.evoa.example/sign-up",
    });

    // act
    const first = await identity.create({
      email: "ana@example.com",
      invitationId: "invitation-1",
    });
    const second = await identity.create({
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
    const identity: IdentityInvitations = new InMemoryIdentityInvitations({
      signUpUrl: "https://accounts.evoa.example/sign-up",
    });
    const previous = await identity.create({
      email: "ana@example.com",
      invitationId: "invitation-1",
    });

    // act
    const replacement = await identity.replace({
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

  it("knows no subject that carries an invitation", async () => {
    // arrange
    const identity: IdentityInvitations = new InMemoryIdentityInvitations({
      signUpUrl: "https://accounts.evoa.example/sign-up",
    });

    // act
    const invitationId = await identity.findInvitationIdForSubject("user_ana");

    // assert
    expect(invitationId).toBeNull();
  });
});
