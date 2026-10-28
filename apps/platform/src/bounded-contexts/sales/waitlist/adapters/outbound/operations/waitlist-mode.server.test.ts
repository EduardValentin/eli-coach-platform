import { describe, expect, it } from "vitest";

import { OperationsWaitlistMode } from "./waitlist-mode.server";

describe("OperationsWaitlistMode", () => {
  it("treats an absent persisted flag as disabled", async () => {
    // arrange
    const waitlistMode = new OperationsWaitlistMode({ read: async () => ({}) });

    // act
    const enabled = await waitlistMode.isEnabled();

    // assert
    expect(enabled).toBe(false);
  });
});
