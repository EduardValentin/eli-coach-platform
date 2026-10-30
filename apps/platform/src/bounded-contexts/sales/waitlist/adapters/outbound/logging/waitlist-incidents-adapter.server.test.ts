import { afterEach, describe, expect, it, vi } from "vitest";

import { ConsoleLoggerAdapter } from "~/shared/logging/console-logger-adapter.server";

import { WaitlistIncidentsAdapter } from "./waitlist-incidents-adapter.server";

describe("WaitlistIncidentsAdapter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs waitlist confirmation delivery failure without recipient data", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const waitlistIncidentsAdapter = new WaitlistIncidentsAdapter(
      new ConsoleLoggerAdapter(),
    );

    // act
    waitlistIncidentsAdapter.confirmationDeliveryFailed();

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
    const waitlistIncidentsAdapter = new WaitlistIncidentsAdapter(
      new ConsoleLoggerAdapter(),
    );

    // act
    waitlistIncidentsAdapter.waitlistModeReadFailed();

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Waitlist mode feature flag read failed.",
      {
        errorCategory: "waitlist_mode_read_failure",
      },
    );
  });
});
