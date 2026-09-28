import { describe, expect, it } from "vitest";

import {
  clientIdentitySchema,
  clientJourneyPortalLink,
  clientJourneyRedirect,
  programStatusSchema,
  welcomePageSchema,
} from "./client-journey";

describe("clientJourneyRedirect", () => {
  it.each([
    ["welcome", "/client/welcome"],
    ["welcome", "/client/onboarding"],
    ["onboarding", "/client/onboarding"],
    ["submitted", "/client"],
    ["submitted", "/client/plan"],
  ] as const)("lets a client at the %s step open %s", (step, requestedPath) => {
    // arrange
    const journeyStep = step;

    // act
    const redirectTo = clientJourneyRedirect(journeyStep, requestedPath);

    // assert
    expect(redirectTo).toBeNull();
  });

  it.each([
    ["welcome", "/client", "/client/welcome"],
    ["welcome", "/client/plan", "/client/welcome"],
    ["onboarding", "/client", "/client/onboarding"],
    ["onboarding", "/client/welcome", "/client/onboarding"],
    ["onboarding", "/client/plan", "/client/onboarding"],
    ["submitted", "/client/welcome", "/client"],
    ["submitted", "/client/onboarding", "/client"],
  ] as const)(
    "sends a client at the %s step who opens %s to %s",
    (step, requestedPath, expectedPath) => {
      // arrange
      const journeyStep = step;

      // act
      const redirectTo = clientJourneyRedirect(journeyStep, requestedPath);

      // assert
      expect(redirectTo).toBe(expectedPath);
    },
  );
});

describe("clientJourneyPortalLink", () => {
  it.each([
    ["welcome", "/client/welcome"],
    ["onboarding", "/client/onboarding"],
  ] as const)(
    "asks a client at the %s step to finish her onboarding at %s",
    (step, expectedHref) => {
      // arrange
      const journeyStep = step;

      // act
      const link = clientJourneyPortalLink(journeyStep);

      // assert
      expect(link).toEqual({
        href: expectedHref,
        label: "Finish your onboarding",
      });
    },
  );

  it("offers no onboarding link once she has sent her onboarding", () => {
    // arrange
    const journeyStep = "submitted";

    // act
    const link = clientJourneyPortalLink(journeyStep);

    // assert
    expect(link).toBeNull();
  });
});

describe("programStatusSchema", () => {
  it.each([
    ["the day the work starts", "2026-10-10T10:00:00.000Z"],
    ["no start day", null],
  ])("accepts a submitted onboarding with %s", (_label, workStartsOn) => {
    // arrange
    const status = {
      kind: "submitted",
      submittedAt: "2026-09-28T10:00:00.000Z",
      workStartsOn,
    };

    // act
    const parsed = programStatusSchema.safeParse(status);

    // assert
    expect(parsed.success).toBe(true);
  });

  it("refuses a submission moment that is not an instant", () => {
    // arrange
    const status = {
      kind: "submitted",
      submittedAt: "yesterday",
      workStartsOn: null,
    };

    // act
    const parsed = programStatusSchema.safeParse(status);

    // assert
    expect(parsed.success).toBe(false);
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
