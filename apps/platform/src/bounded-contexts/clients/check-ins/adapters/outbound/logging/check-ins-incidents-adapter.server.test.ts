import { afterEach, describe, expect, it, vi } from "vitest";

import { ConsoleLoggerAdapter } from "~/shared/logging/console-logger-adapter.server";

import { CheckInsIncidentsAdapter } from "./check-ins-incidents-adapter.server";

describe("createCheckInsIncidents", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs a failed check-in notification with the check-in and the event, without the recipient", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const logger = new CheckInsIncidentsAdapter(new ConsoleLoggerAdapter());

    // act
    logger.checkInNotificationFailed({
      checkInId: "6f2b9c1e-4d3a-4e8b-9a7c-1d2e3f4a5b6c",
      notification: "approved",
    });

    // assert
    expect(consoleError).toHaveBeenCalledWith("Check-in notification failed.", {
      checkInId: "6f2b9c1e-4d3a-4e8b-9a7c-1d2e3f4a5b6c",
      errorCategory: "check_in_notification_failure",
      notification: "approved",
    });
  });

  it("logs check-ins awaiting an answer that could not be counted by party and the class of its cause only", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const logger = new CheckInsIncidentsAdapter(new ConsoleLoggerAdapter());

    // act
    logger.awaitingCheckInsCountFailed({
      error: new TypeError("secret row contents"),
      party: "client",
    });

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Check-ins awaiting an answer could not be counted.",
      {
        errorCategory: "check_in_awaiting_count_failure",
        errorClass: "TypeError",
        party: "client",
      },
    );
  });

  it("logs check-ins awaiting an answer that could not be listed by the class of its cause only", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const logger = new CheckInsIncidentsAdapter(new ConsoleLoggerAdapter());

    // act
    logger.awaitingCheckInsListFailed({
      error: new TypeError("secret row contents"),
    });

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Check-ins awaiting an answer could not be listed.",
      {
        errorCategory: "check_in_awaiting_list_failure",
        errorClass: "TypeError",
      },
    );
  });

  it("logs a client's next check-in that could not be found by the class of its cause only", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const logger = new CheckInsIncidentsAdapter(new ConsoleLoggerAdapter());

    // act
    logger.nextCheckInLookupFailed({
      error: new TypeError("secret row contents"),
    });

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "The client's next check-in could not be found.",
      {
        errorCategory: "check_in_next_lookup_failure",
        errorClass: "TypeError",
      },
    );
  });

  it("logs a failed weekly check-in notification with the series and the event, without the recipient", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const logger = new CheckInsIncidentsAdapter(new ConsoleLoggerAdapter());

    // act
    logger.checkInSeriesNotificationFailed({
      seriesId: "6f2b9c1e-4d3a-4e8b-9a7c-1d2e3f4a5b6c",
      notification: "seriesSetUp",
    });

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Weekly check-in notification failed.",
      {
        errorCategory: "check_in_series_notification_failure",
        notification: "seriesSetUp",
        seriesId: "6f2b9c1e-4d3a-4e8b-9a7c-1d2e3f4a5b6c",
      },
    );
  });

  it("logs a check-in event missing from the other party's bell with the check-in and the event only", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const logger = new CheckInsIncidentsAdapter(new ConsoleLoggerAdapter());

    // act
    logger.checkInInboxFailed({
      checkInId: "6f2b9c1e-4d3a-4e8b-9a7c-1d2e3f4a5b6c",
      event: "approved",
    });

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Check-in notification could not be recorded in the bell.",
      {
        checkInId: "6f2b9c1e-4d3a-4e8b-9a7c-1d2e3f4a5b6c",
        errorCategory: "check_in_inbox_failure",
        event: "approved",
      },
    );
  });

  it("logs a weekly check-in event missing from the bell with the series and the event only", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const logger = new CheckInsIncidentsAdapter(new ConsoleLoggerAdapter());

    // act
    logger.checkInSeriesInboxFailed({
      seriesId: "6f2b9c1e-4d3a-4e8b-9a7c-1d2e3f4a5b6c",
      event: "clashesAdded",
    });

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Weekly check-in notification could not be recorded in the bell.",
      {
        errorCategory: "check_in_series_inbox_failure",
        event: "clashesAdded",
        seriesId: "6f2b9c1e-4d3a-4e8b-9a7c-1d2e3f4a5b6c",
      },
    );
  });

  it("logs a weekly check-in that could not be extended by client and the class and code of its cause only", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const logger = new CheckInsIncidentsAdapter(new ConsoleLoggerAdapter());

    // act
    logger.checkInSeriesExtensionFailed({
      clientId: "client-1",
      error: Object.assign(new Error("deadlock detected"), { code: "40P01" }),
    });

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Weekly check-in could not be extended; its new weeks are missing.",
      {
        clientId: "client-1",
        errorCategory: "check_in_series_extension_failure",
        errorClass: "Error",
        errorCode: "40P01",
      },
    );
  });

  it("logs a weekly check-in that could not be read by client and the class and code of its cause only", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const logger = new CheckInsIncidentsAdapter(new ConsoleLoggerAdapter());

    // act
    logger.checkInSeriesReadFailed({
      clientId: "client-1",
      error: Object.assign(new Error("connection reset"), { code: "08006" }),
    });

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Weekly check-in could not be read; the client record shows none.",
      {
        clientId: "client-1",
        errorCategory: "check_in_series_read_failure",
        errorClass: "Error",
        errorCode: "08006",
      },
    );
  });
});
