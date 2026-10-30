import { describe, expect, it } from "vitest";

import type { InvitationReferencesPort } from "~/bounded-contexts/access/accounts/domain/account";

import { InMemoryInvitationReferencesAdapter } from "./in-memory-invitation-references-adapter.server";

describe("InMemoryInvitationReferences", () => {
  it("knows no subject that carries an invitation", async () => {
    // arrange
    const invitationReferencesPort: InvitationReferencesPort =
      new InMemoryInvitationReferencesAdapter();

    // act
    const invitationId =
      await invitationReferencesPort.invitationIdOf("user_ana");

    // assert
    expect(invitationId).toBeNull();
  });
});
