import { afterEach, describe, expect, it, vi } from "vitest";

import { createConsoleLogger } from "~/shared/logging/console-logger.server";

import { createNotificationsIncidents } from "./notifications-incidents.server";

describe("createNotificationsIncidents", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs a bell that could not be read by party and the class and code of its cause only", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const logger = createNotificationsIncidents(createConsoleLogger());

    // act
    logger.notificationBellReadFailed({
      party: "client",
      error: Object.assign(new Error("secret row contents"), {
        code: "57P01",
      }),
    });

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "The notification bell could not be read; it shows no notifications.",
      {
        errorCategory: "notification_bell_read_failure",
        errorClass: "Error",
        errorCode: "57P01",
        party: "client",
      },
    );
  });
});
