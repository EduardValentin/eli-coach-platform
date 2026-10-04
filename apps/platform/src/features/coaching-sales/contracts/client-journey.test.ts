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
    ["in-review", "/client"],
    ["in-review", "/client/plan"],
    ["needs-details", "/client"],
    ["needs-details", "/client/plan"],
    ["needs-details", "/client/onboarding"],
    ["approved", "/client"],
    ["approved", "/client/plan"],
    ["submitted", "/client/settings"],
    ["approved", "/client/settings"],
  ] as const)("lets a client at the %s step open %s", (step, requestedPath) => {
    // arrange
    const journeyStep = step;

    // act
    const redirectTo = clientJourneyRedirect(
      { step: journeyStep, access: "open" },
      requestedPath,
    );

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
    ["in-review", "/client/welcome", "/client"],
    ["in-review", "/client/onboarding", "/client"],
    ["needs-details", "/client/welcome", "/client"],
    ["approved", "/client/welcome", "/client"],
    ["approved", "/client/onboarding", "/client"],
    ["welcome", "/client/settings", "/client/welcome"],
    ["onboarding", "/client/settings", "/client/onboarding"],
    ["welcome", "/client/ended", "/client/welcome"],
    ["onboarding", "/client/ended", "/client/onboarding"],
    ["submitted", "/client/ended", "/client"],
    ["needs-details", "/client/ended", "/client"],
    ["approved", "/client/ended", "/client"],
    ["approved", "/client/ended/", "/client"],
    ["approved", "/Client/Ended", "/client"],
    ["welcome", "/CLIENT/ENDED/", "/client/welcome"],
    ["approved", "/client/%65nded", "/client"],
  ] as const)(
    "sends a client at the %s step who opens %s to %s",
    (step, requestedPath, expectedPath) => {
      // arrange
      const journeyStep = step;

      // act
      const redirectTo = clientJourneyRedirect(
        { step: journeyStep, access: "open" },
        requestedPath,
      );

      // assert
      expect(redirectTo).toBe(expectedPath);
    },
  );
});

describe("clientJourneyRedirect over a path written differently", () => {
  it.each([
    ["approved", "/client/"],
    ["onboarding", "/client/onboarding/"],
    ["needs-details", "/Client/Onboarding"],
  ] as const)("lets a client at the %s step open %s", (step, requestedPath) => {
    // act
    const redirectTo = clientJourneyRedirect(
      { step, access: "open" },
      requestedPath,
    );

    // assert
    expect(redirectTo).toBeNull();
  });

  it.each(["/client/ended/", "/Client/Ended", "/client/%65nded"])(
    "lets a client whose coaching has ended open %s",
    (requestedPath) => {
      // act
      const redirectTo = clientJourneyRedirect(
        { step: "approved", access: "ended" },
        requestedPath,
      );

      // assert
      expect(redirectTo).toBeNull();
    },
  );
});

describe("clientJourneyRedirect once her coaching has ended", () => {
  it.each(["welcome", "submitted", "approved"] as const)(
    "lets a client at the %s step open the ended page",
    (step) => {
      // act
      const redirectTo = clientJourneyRedirect(
        { step, access: "ended" },
        "/client/ended",
      );

      // assert
      expect(redirectTo).toBeNull();
    },
  );

  it.each([
    ["approved", "/client"],
    ["approved", "/client/settings"],
    ["approved", "/client/profile"],
    ["needs-details", "/client/onboarding"],
    ["welcome", "/client/welcome"],
    ["approved", "/client/%E0%A4%A"],
  ] as const)(
    "sends a client at the %s step who opens %s to the ended page",
    (step, requestedPath) => {
      // act
      const redirectTo = clientJourneyRedirect(
        { step, access: "ended" },
        requestedPath,
      );

      // assert
      expect(redirectTo).toBe("/client/ended");
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
      const link = clientJourneyPortalLink({
        step: journeyStep,
        access: "open",
      });

      // assert
      expect(link).toEqual({
        href: expectedHref,
        label: "Finish your onboarding",
      });
    },
  );

  it.each(["welcome", "onboarding"] as const)(
    "offers no onboarding link at the %s step once her coaching has ended",
    (step) => {
      // act
      const link = clientJourneyPortalLink({ step, access: "ended" });

      // assert
      expect(link).toBeNull();
    },
  );

  it.each(["submitted", "in-review", "needs-details", "approved"] as const)(
    "offers no onboarding link once she has sent her onboarding, at the %s step",
    (step) => {
      // arrange
      const journeyStep = step;

      // act
      const link = clientJourneyPortalLink({
        step: journeyStep,
        access: "open",
      });

      // assert
      expect(link).toBeNull();
    },
  );
});

describe("programStatusSchema", () => {
  it("accepts until when she can still start now", () => {
    // arrange
    const status = {
      kind: "submitted",
      submittedAt: "2026-09-28T10:00:00.000Z",
      workStartsOn: "2026-10-10T10:00:00.000Z",
      startNowUntil: "2026-10-10T10:00:00.000Z",
    };

    // act
    const parsed = programStatusSchema.safeParse(status);

    // assert
    expect(parsed.success).toBe(true);
  });

  it.each([
    ["the day the work starts", "2026-10-10T10:00:00.000Z"],
    ["no start day", null],
  ])("accepts a submitted onboarding with %s", (_label, workStartsOn) => {
    // arrange
    const status = {
      kind: "submitted",
      submittedAt: "2026-09-28T10:00:00.000Z",
      workStartsOn,
      startNowUntil: workStartsOn,
    };

    // act
    const parsed = programStatusSchema.safeParse(status);

    // assert
    expect(parsed.success).toBe(true);
  });

  it.each(["in-review", "needs-details", "approved"])(
    "accepts a program status at the %s step",
    (kind) => {
      // arrange
      const status = {
        kind,
        submittedAt: "2026-09-28T10:00:00.000Z",
        workStartsOn: null,
        startNowUntil: null,
      };

      // act
      const parsed = programStatusSchema.safeParse(status);

      // assert
      expect(parsed.success).toBe(true);
    },
  );

  it("refuses a program status at a step before she sent her onboarding", () => {
    // arrange
    const status = {
      kind: "onboarding",
      submittedAt: "2026-09-28T10:00:00.000Z",
      workStartsOn: null,
      startNowUntil: null,
    };

    // act
    const parsed = programStatusSchema.safeParse(status);

    // assert
    expect(parsed.success).toBe(false);
  });

  it("refuses a submission moment that is not an instant", () => {
    // arrange
    const status = {
      kind: "submitted",
      submittedAt: "yesterday",
      workStartsOn: null,
      startNowUntil: null,
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
