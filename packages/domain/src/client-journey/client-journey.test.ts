import { describe, expect, it } from "vitest";

import { ClientJourney } from "./client-journey";

function journey(
  overrides: Partial<Parameters<typeof ClientJourney.from>[0]> = {},
): ClientJourney {
  return ClientJourney.from({
    clientId: "client-1",
    firstName: "Ana",
    gender: "female",
    lastName: "Popescu",
    welcomeSeenAt: null,
    onboardingSubmittedAt: null,
    reviewOpenedAt: null,
    detailsRequestedAt: null,
    detailsAnsweredAt: null,
    answersApprovedAt: null,
    ...overrides,
  });
}

describe("ClientJourney#step", () => {
  it.each([
    ["welcome until she has seen it", null, null, "welcome"],
    [
      "onboarding once she has seen welcome",
      new Date("2026-09-27T10:00:00.000Z"),
      null,
      "onboarding",
    ],
    [
      "submitted once she has sent her onboarding",
      new Date("2026-09-27T10:00:00.000Z"),
      new Date("2026-09-28T10:00:00.000Z"),
      "submitted",
    ],
  ] as const)(
    "is %s",
    (_label, welcomeSeenAt, onboardingSubmittedAt, expected) => {
      // arrange
      const clientJourney = journey({ welcomeSeenAt, onboardingSubmittedAt });

      // act
      const step = clientJourney.step();

      // assert
      expect(step).toBe(expected);
    },
  );
});

describe("ClientJourney#step, once she has submitted", () => {
  const SUBMITTED_AT = new Date("2026-09-28T10:00:00.000Z");
  const OPENED_AT = new Date("2026-09-28T11:00:00.000Z");
  const ASKED_AT = new Date("2026-09-28T12:00:00.000Z");
  const ANSWERED_AT = new Date("2026-09-29T10:00:00.000Z");

  it.each([
    [
      "in-review once the coach opens her answers",
      { reviewOpenedAt: OPENED_AT },
      "in-review",
    ],
    [
      "needs-details while the coach's request is unanswered",
      { reviewOpenedAt: OPENED_AT, detailsRequestedAt: ASKED_AT },
      "needs-details",
    ],
    [
      "in-review again once she answers",
      {
        reviewOpenedAt: OPENED_AT,
        detailsRequestedAt: ASKED_AT,
        detailsAnsweredAt: ANSWERED_AT,
      },
      "in-review",
    ],
    [
      "approved once the coach approves",
      { reviewOpenedAt: OPENED_AT, answersApprovedAt: ANSWERED_AT },
      "approved",
    ],
  ] as const)("is %s", (_label, stamps, expected) => {
    // arrange
    const clientJourney = journey({
      welcomeSeenAt: SUBMITTED_AT,
      onboardingSubmittedAt: SUBMITTED_AT,
      ...stamps,
    });

    // act
    const step = clientJourney.step();

    // assert
    expect(step).toBe(expected);
  });
});

describe("ClientJourney#welcomeWording", () => {
  it.each([
    ["female", "five-part"],
    ["prefer_not_to_say", "four-part"],
    ["male", "four-part"],
  ] as const)("reads the %s client the %s wording", (gender, expected) => {
    // arrange
    const clientJourney = journey({ gender });

    // act
    const wording = clientJourney.welcomeWording();

    // assert
    expect(wording).toBe(expected);
  });
});

describe("ClientJourney#toSnapshot", () => {
  it("carries her names, gender and the moments she saw welcome and sent her onboarding", () => {
    // arrange
    const welcomeSeenAt = new Date("2026-09-27T10:00:00.000Z");
    const onboardingSubmittedAt = new Date("2026-09-28T10:00:00.000Z");
    const clientJourney = journey({ welcomeSeenAt, onboardingSubmittedAt });

    // act
    const snapshot = clientJourney.toSnapshot();

    // assert
    expect(snapshot).toEqual({
      clientId: "client-1",
      firstName: "Ana",
      gender: "female",
      lastName: "Popescu",
      welcomeSeenAt,
      onboardingSubmittedAt,
      reviewOpenedAt: null,
      detailsRequestedAt: null,
      detailsAnsweredAt: null,
      answersApprovedAt: null,
    });
  });
});
