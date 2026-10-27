import { describe, expect, it } from "vitest";

import { RandomClientInvitationIds } from "./random-client-invitation-ids.server";

const RANDOM_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("RandomClientInvitationIds", () => {
  it("names every invitation with a fresh random uuid, never a sequence another environment could repeat", () => {
    // arrange
    const invitationIds = new RandomClientInvitationIds();

    // act
    const first = invitationIds.generate();
    const second = invitationIds.generate();

    // assert
    expect(first).toMatch(RANDOM_UUID);
    expect(second).toMatch(RANDOM_UUID);
    expect(second).not.toBe(first);
  });
});
