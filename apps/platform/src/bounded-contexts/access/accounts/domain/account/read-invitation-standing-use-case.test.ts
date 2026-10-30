import { describe, expect, it, vi } from "vitest";

import { AccountInvitation } from "./account-invitation";
import { ReadInvitationStandingUseCase } from "./read-invitation-standing-use-case";

const SENT_AT = new Date("2026-09-27T10:00:00.000Z");
const EXPIRES_AT = new Date("2026-10-27T10:00:00.000Z");
const NOW = new Date("2026-10-01T10:00:00.000Z");

function invitation(
  overrides: Partial<Parameters<typeof AccountInvitation.reconstitute>[0]> = {},
): AccountInvitation {
  return AccountInvitation.reconstitute({
    ...AccountInvitation.issue({
      id: "invitation-1",
      email: "ana@example.com",
      role: "CLIENT",
      tokenHash: "c".repeat(64),
      sentAt: SENT_AT,
    }).toSnapshot(),
    emailSentAt: SENT_AT,
    ...overrides,
  });
}

function createInvitations(found: AccountInvitation | null) {
  return { findById: vi.fn().mockResolvedValue(found) };
}

describe("ReadInvitationStandingUseCase", () => {
  it("reads her invitation's standing with when it was sent and when it expires", async () => {
    // arrange
    const invitations = createInvitations(
      invitation({ emailDeliveryFailedAt: SENT_AT, emailSentAt: null }),
    );
    const readInvitationStandingUseCase = new ReadInvitationStandingUseCase({
      accountInvitationsPort: invitations,
      clockPort: { now: () => NOW },
    });

    // act
    const result = await readInvitationStandingUseCase.execute("invitation-1");

    // assert
    expect(result).toEqual({
      state: "email-failed",
      sentAt: SENT_AT,
      expiresAt: EXPIRES_AT,
    });
    expect(invitations.findById).toHaveBeenCalledWith("invitation-1");
  });

  it.each([
    ["no invitation", null],
    [
      "an accepted invitation",
      invitation({ acceptedAt: NOW, acceptedByAuthSubjectId: "user_ana" }),
    ],
  ])("reads nothing for %s", async (_label, found) => {
    // arrange
    const readInvitationStandingUseCase = new ReadInvitationStandingUseCase({
      accountInvitationsPort: createInvitations(found),
      clockPort: { now: () => NOW },
    });

    // act
    const result = await readInvitationStandingUseCase.execute("invitation-1");

    // assert
    expect(result).toBeNull();
  });
});
