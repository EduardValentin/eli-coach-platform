import { describe, expect, it } from "vitest";

import { programStatusSchema } from "./program-status";

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
