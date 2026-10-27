import { afterEach, describe, expect, it, vi } from "vitest";

import { createConsoleLogger } from "~/shared/logging/console-logger.server";

import { createWaitlistIncidents } from "./waitlist-incidents.server";

describe("createWaitlistIncidents", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs waitlist confirmation delivery failure without recipient data", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const logger = createWaitlistIncidents(createConsoleLogger());

    // act
    logger.confirmationDeliveryFailed();

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Waitlist confirmation email failed.",
      {
        errorCategory: "waitlist_confirmation_failure",
      },
    );
  });

  it("logs a failed waitlist mode feature flag read", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const logger = createWaitlistIncidents(createConsoleLogger());

    // act
    logger.waitlistModeReadFailed();

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Waitlist mode feature flag read failed.",
      {
        errorCategory: "waitlist_mode_read_failure",
      },
    );
  });
});
