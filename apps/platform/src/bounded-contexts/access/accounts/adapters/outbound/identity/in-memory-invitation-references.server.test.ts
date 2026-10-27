import { describe, expect, it } from "vitest";

import type { InvitationReferences } from "~/bounded-contexts/access/accounts/domain/account";

import { InMemoryInvitationReferences } from "./in-memory-invitation-references.server";

describe("InMemoryInvitationReferences", () => {
  it("knows no subject that carries an invitation", async () => {
    // arrange
    const references: InvitationReferences = new InMemoryInvitationReferences();

    // act
    const invitationId = await references.invitationIdOf("user_ana");

    // assert
    expect(invitationId).toBeNull();
  });
});
