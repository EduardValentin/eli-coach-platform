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
    ...overrides,
  });
}

describe("ClientJourney#step", () => {
  it.each([
    ["welcome until she has seen it", null, "welcome"],
    [
      "onboarding once she has seen welcome",
      new Date("2026-09-27T10:00:00.000Z"),
      "onboarding",
    ],
  ] as const)("is %s", (_label, welcomeSeenAt, expected) => {
    // arrange
    const clientJourney = journey({ welcomeSeenAt });

    // act
    const step = clientJourney.step();

    // assert
    expect(step).toBe(expected);
  });
});

describe("ClientJourney#welcomeWording", () => {
  it.each([
    ["female", "five-part"],
    ["prefer_not_to_say", "five-part"],
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
  it("carries her names, gender and the moment she saw welcome", () => {
    // arrange
    const welcomeSeenAt = new Date("2026-09-27T10:00:00.000Z");
    const clientJourney = journey({ welcomeSeenAt });

    // act
    const snapshot = clientJourney.toSnapshot();

    // assert
    expect(snapshot).toEqual({
      clientId: "client-1",
      firstName: "Ana",
      gender: "female",
      lastName: "Popescu",
      welcomeSeenAt,
    });
  });
});
