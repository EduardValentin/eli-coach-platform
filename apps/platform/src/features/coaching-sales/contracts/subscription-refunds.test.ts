import { describe, expect, it } from "vitest";

import { REFUND_REASON_LABELS } from "./subscription-refunds";

describe("REFUND_REASON_LABELS", () => {
  it("names the withdrawal period's length for a full refund", () => {
    // arrange
    const reason = "full-refund";

    // act
    const label = REFUND_REASON_LABELS[reason];

    // assert
    expect(label).toBe(
      "Full refund: cancelled within the 14-day withdrawal period.",
    );
  });
});
