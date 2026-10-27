import { describe, expect, it, vi } from "vitest";

import { ClientInvitation } from "./client-invitation";
import type { ClientInvitations } from "./client-invitations";
import { ReadClientInvitationUseCase } from "./read-client-invitation-use-case";

const SENT_AT = new Date("2026-09-27T10:00:00.000Z");
const EXPIRES_AT = new Date("2026-10-27T10:00:00.000Z");
const NOW = new Date("2026-10-01T10:00:00.000Z");

function invitation(
  overrides: Partial<Parameters<typeof ClientInvitation.reconstitute>[0]> = {},
): ClientInvitation {
  return ClientInvitation.reconstitute({
    ...ClientInvitation.issue({
      id: "invitation-1",
      clientId: "client-1",
      email: "ana@example.com",
      tokenHash: "c".repeat(64),
      sentAt: SENT_AT,
    }),
    emailSentAt: SENT_AT,
    ...overrides,
  });
}

function createInvitations(found: ClientInvitation | null) {
  return {
    findById: vi.fn(),
    findByClientId: vi.fn().mockResolvedValue(found),
    findByTokenHash: vi.fn(),
    insert: vi.fn(),
    reissue: vi.fn(),
    recordProvider: vi.fn(),
    recordEmailSent: vi.fn(),
    recordEmailDeliveryFailed: vi.fn(),
    accept: vi.fn(),
  } satisfies ClientInvitations;
}

describe("ReadClientInvitationUseCase", () => {
  it("reads her invitation's standing with when it was sent and when it expires", async () => {
    // arrange
    const invitations = createInvitations(
      invitation({ emailDeliveryFailedAt: SENT_AT, emailSentAt: null }),
    );
    const useCase = new ReadClientInvitationUseCase({
      invitations,
      clock: { now: () => NOW },
    });

    // act
    const result = await useCase.execute("client-1");

    // assert
    expect(result).toEqual({
      state: "email-failed",
      sentAt: SENT_AT,
      expiresAt: EXPIRES_AT,
    });
    expect(invitations.findByClientId).toHaveBeenCalledWith("client-1");
  });

  it.each([
    ["no invitation", null],
    [
      "a used invitation",
      invitation({ usedAt: NOW, acceptedByAuthSubjectId: "user_ana" }),
    ],
  ])("reads nothing for %s", async (_label, found) => {
    // arrange
    const useCase = new ReadClientInvitationUseCase({
      invitations: createInvitations(found),
      clock: { now: () => NOW },
    });

    // act
    const result = await useCase.execute("client-1");

    // assert
    expect(result).toBeNull();
  });
});
