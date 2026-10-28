import { describe, expect, it } from "vitest";

import { OperationsWaitlistMode } from "./waitlist-mode.server";

describe("OperationsWaitlistMode", () => {
  it("opens sales when no waitlist mode is persisted", async () => {
    // arrange
    const waitlistMode = new OperationsWaitlistMode({ read: async () => ({}) });

    // act
    const enabled = await waitlistMode.isEnabled();

    // assert
    expect(enabled).toBe(false);
  });
});
