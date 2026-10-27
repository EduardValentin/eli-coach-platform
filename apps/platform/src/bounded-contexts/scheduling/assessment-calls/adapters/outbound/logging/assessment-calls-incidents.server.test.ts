import { afterEach, describe, expect, it, vi } from "vitest";

import { createConsoleLogger } from "~/shared/logging/console-logger.server";

import { createAssessmentCallsIncidents } from "./assessment-calls-incidents.server";

describe("createAssessmentCallsIncidents", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs a failed assessment call booking mode read", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const logger = createAssessmentCallsIncidents(createConsoleLogger());

    // act
    logger.bookingModeReadFailed();

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Assessment call booking mode read failed.",
      {
        errorCategory: "assessment_call_booking_mode_read_failure",
      },
    );
  });

  it("logs a failed assessment call notification with its recipient", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const logger = createAssessmentCallsIncidents(createConsoleLogger());

    // act
    logger.notificationFailed({ recipient: "coach" });

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Assessment call notification failed.",
      {
        errorCategory: "assessment_call_notification_failure",
        recipient: "coach",
      },
    );
  });

  it("logs unreadable assessment call slots", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const logger = createAssessmentCallsIncidents(createConsoleLogger());

    // act
    logger.slotsReadFailed();

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Assessment call slots could not be read.",
      {
        errorCategory: "assessment_call_slots_failure",
      },
    );
  });
});
