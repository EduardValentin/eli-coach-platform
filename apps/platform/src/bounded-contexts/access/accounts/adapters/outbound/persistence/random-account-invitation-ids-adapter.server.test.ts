import { describe, expect, it } from "vitest";

import { RandomAccountInvitationIdsAdapter } from "./random-account-invitation-ids-adapter.server";

const RANDOM_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("RandomAccountInvitationIds", () => {
  it("names every invitation with a fresh random uuid, never a sequence another environment could repeat", () => {
    // arrange
    const randomAccountInvitationIdsAdapter =
      new RandomAccountInvitationIdsAdapter();

    // act
    const first = randomAccountInvitationIdsAdapter.generate();
    const second = randomAccountInvitationIdsAdapter.generate();

    // assert
    expect(first).toMatch(RANDOM_UUID);
    expect(second).toMatch(RANDOM_UUID);
    expect(second).not.toBe(first);
  });
});
