import { describe, expect, it } from "vitest";

import { emailsOwnedByRun } from "./assessment-calls";

const RUN_ID = "run1";

describe("emailsOwnedByRun", () => {
  it("keeps the run's own +clerk_test addresses", () => {
    // arrange
    const recorded = [
      "e2e-run1-0-1+clerk_test@evoa.fit",
      "e2e-run1-3-2+clerk_test@evoa.fit",
    ];

    // act
    const owned = emailsOwnedByRun(recorded, RUN_ID);

    // assert
    expect(owned).toEqual(recorded);
  });

  it("drops addresses that do not carry this run's id", () => {
    // arrange
    const recorded = [
      "e2e-run12-0-1+clerk_test@evoa.fit",
      "e2e-other-0-1+clerk_test@evoa.fit",
      "parity-run1+clerk_test@evoa.fit",
    ];

    // act
    const owned = emailsOwnedByRun(recorded, RUN_ID);

    // assert
    expect(owned).toEqual([]);
  });

  it("drops run addresses without the +clerk_test subaddress", () => {
    // arrange
    const recorded = [
      "e2e-run1-0-1@evoa.fit",
      "e2e-run1-0-1+other@evoa.fit",
      "booking-run1@evoa.fit",
    ];

    // act
    const owned = emailsOwnedByRun(recorded, RUN_ID);

    // assert
    expect(owned).toEqual([]);
  });
});
