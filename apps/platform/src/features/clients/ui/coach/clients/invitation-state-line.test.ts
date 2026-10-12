import { describe, expect, it } from "vitest";

import { invitationStateLine } from "./invitation-state-line";

const BUCHAREST = "Europe/Bucharest";
const LOS_ANGELES = "America/Los_Angeles";

describe("the invitation state line", () => {
  const invitation = {
    expiresAt: "2026-10-31T22:30:00.000Z",
    sentAt: "2026-10-01T09:00:00.000Z",
  };

  it("gives the day it was sent and the day it expires while it is pending", () => {
    // arrange
    const pending = { ...invitation, state: "pending" } as const;

    // act
    const line = invitationStateLine(pending, BUCHAREST);

    // assert
    expect(line).toBe("Invited 1 October · expires 1 November");
  });

  it("gives the day it expired once it has", () => {
    // arrange
    const expired = { ...invitation, state: "expired" } as const;

    // act
    const line = invitationStateLine(expired, LOS_ANGELES);

    // assert
    expect(line).toBe("Invitation expired 31 October");
  });

  it("says the email could not be sent when it failed", () => {
    // arrange
    const failed = { ...invitation, state: "email-failed" } as const;

    // act
    const line = invitationStateLine(failed, BUCHAREST);

    // assert
    expect(line).toBe("Invitation email could not be sent");
  });
});
