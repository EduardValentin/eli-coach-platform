import { describe, expect, it } from "vitest";

import {
  clientIdentitySchema,
  clientJourneyDestination,
  welcomePageSchema,
} from "./client-journey";

describe("clientJourneyDestination", () => {
  it.each([
    ["welcome", "/client/welcome"],
    ["onboarding", "/client/onboarding"],
  ] as const)("sends a client at the %s step to %s", (step, expectedPath) => {
    // arrange
    const journeyStep = step;

    // act
    const destination = clientJourneyDestination(journeyStep);

    // assert
    expect(destination).toBe(expectedPath);
  });
});

describe("welcomePageSchema", () => {
  it("accepts her first name with the wording for her form", () => {
    // arrange
    const page = { firstName: "Ana", wording: "five-part" };

    // act
    const parsed = welcomePageSchema.safeParse(page);

    // assert
    expect(parsed.success).toBe(true);
  });

  it("refuses a wording the welcome screen has no copy for", () => {
    // arrange
    const page = { firstName: "Ana", wording: "three-part" };

    // act
    const parsed = welcomePageSchema.safeParse(page);

    // assert
    expect(parsed.success).toBe(false);
  });
});

describe("clientIdentitySchema", () => {
  it("accepts her first and last name", () => {
    // arrange
    const identity = { firstName: "Ana", lastName: "Popescu" };

    // act
    const parsed = clientIdentitySchema.safeParse(identity);

    // assert
    expect(parsed.success).toBe(true);
  });

  it("refuses an identity with no first name to greet her by", () => {
    // arrange
    const identity = { firstName: "", lastName: "Popescu" };

    // act
    const parsed = clientIdentitySchema.safeParse(identity);

    // assert
    expect(parsed.success).toBe(false);
  });
});
