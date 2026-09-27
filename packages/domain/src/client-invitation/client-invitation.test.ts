import { describe, expect, it } from "vitest";

import { ClientInvitation } from "./client-invitation";

const SENT_AT = new Date("2026-09-27T10:00:00.000Z");
const EXPIRES_AT = new Date("2026-10-27T10:00:00.000Z");

function pendingInvitation(): ClientInvitation {
  return ClientInvitation.issue({
    id: "invitation-1",
    clientId: "client-1",
    email: "ana@example.com",
    tokenHash: "a".repeat(64),
    sentAt: SENT_AT,
  });
}

function acceptedInvitation(): ClientInvitation {
  return ClientInvitation.reconstitute({
    ...pendingInvitation(),
    usedAt: new Date("2026-09-28T10:00:00.000Z"),
    acceptedByAuthSubjectId: "user_ana",
  });
}

describe("ClientInvitation.issue", () => {
  it("is valid for thirty days from the moment it is sent and awaits its email", () => {
    // arrange
    // act
    const invitation = pendingInvitation();

    // assert
    expect(invitation).toMatchObject({
      id: "invitation-1",
      clientId: "client-1",
      email: "ana@example.com",
      sentAt: SENT_AT,
      expiresAt: EXPIRES_AT,
      usedAt: null,
      acceptedByAuthSubjectId: null,
      provider: null,
    });
    expect(invitation.awaitsEmail()).toBe(true);
  });
});

describe("ClientInvitation#reissue", () => {
  it("rewrites the token and the validity from the new send time and keeps the identity invitation", () => {
    // arrange
    const provider = { id: "inv_1", url: "https://accounts.example/sign-up" };
    const invitation = ClientInvitation.reconstitute({
      ...pendingInvitation(),
      provider,
    });
    const resentAt = new Date("2026-09-28T10:00:00.000Z");

    // act
    const reissued = invitation.reissue({
      tokenHash: "b".repeat(64),
      sentAt: resentAt,
    });

    // assert
    expect(reissued).toMatchObject({
      id: "invitation-1",
      tokenHash: "b".repeat(64),
      sentAt: resentAt,
      expiresAt: new Date("2026-10-28T10:00:00.000Z"),
      provider,
    });
    expect(reissued.awaitsEmail()).toBe(true);
  });
});

describe("ClientInvitation#resolve", () => {
  it.each([
    ["valid right after it is sent", pendingInvitation(), SENT_AT, "valid"],
    [
      "valid one millisecond before it expires",
      pendingInvitation(),
      new Date(EXPIRES_AT.getTime() - 1),
      "valid",
    ],
    [
      "expired once its validity ends",
      pendingInvitation(),
      EXPIRES_AT,
      "expired",
    ],
    ["used once accepted", acceptedInvitation(), SENT_AT, "used"],
    [
      "used even after it would have expired",
      acceptedInvitation(),
      EXPIRES_AT,
      "used",
    ],
  ] as const)("is %s", (_label, invitation, now, expected) => {
    // arrange
    // act
    const resolution = invitation.resolve(now);

    // assert
    expect(resolution).toBe(expected);
    expect(invitation.isPending(now)).toBe(expected === "valid");
  });
});

describe("ClientInvitation#wasAcceptedBy", () => {
  it.each([
    ["the subject that accepted it", acceptedInvitation(), "user_ana", true],
    ["another subject", acceptedInvitation(), "user_other", false],
    ["anyone while it is unused", pendingInvitation(), "user_ana", false],
  ] as const)("answers for %s", (_label, invitation, subject, expected) => {
    // arrange
    // act
    const accepted = invitation.wasAcceptedBy(subject);

    // assert
    expect(accepted).toBe(expected);
  });
});

describe("ClientInvitation#awaitsEmail", () => {
  it.each([
    ["sent", { emailSentAt: SENT_AT }],
    ["whose delivery failed", { emailDeliveryFailedAt: SENT_AT }],
  ])("is false once its email was %s", (_label, emailOutcome) => {
    // arrange
    const invitation = ClientInvitation.reconstitute({
      ...pendingInvitation(),
      ...emailOutcome,
    });

    // act
    const awaitsEmail = invitation.awaitsEmail();

    // assert
    expect(awaitsEmail).toBe(false);
  });
});
