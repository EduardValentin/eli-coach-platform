import { describe, expect, it } from "vitest";

import { formatEffectiveDate } from "./legal-document";

describe("formatEffectiveDate", () => {
  it("formats an ISO date as a long en-GB date", () => {
    // arrange
    const isoDate = "2026-07-26";

    // act
    const label = formatEffectiveDate(isoDate);

    // assert
    expect(label).toBe("26 July 2026");
  });
});
