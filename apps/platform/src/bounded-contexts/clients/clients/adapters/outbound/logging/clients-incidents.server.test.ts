import { afterEach, describe, expect, it, vi } from "vitest";

import { createConsoleLogger } from "~/shared/logging/console-logger.server";

import { createClientsIncidents } from "./clients-incidents.server";

describe("createClientsIncidents", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs an unreadable client roster by error class only, never the failed query", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const logger = createClientsIncidents(createConsoleLogger());

    // act
    logger.rosterReadFailed(
      new TypeError('Failed query: select "email" from "app"."clients"'),
    );

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Client roster could not be read.",
      {
        errorCategory: "client_roster_read_failure",
        errorClass: "TypeError",
      },
    );
  });

  it("logs an unreadable client roster that failed without an error", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const logger = createClientsIncidents(createConsoleLogger());

    // act
    logger.rosterReadFailed("database down");

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Client roster could not be read.",
      {
        errorCategory: "client_roster_read_failure",
        errorClass: "string",
      },
    );
  });
});
