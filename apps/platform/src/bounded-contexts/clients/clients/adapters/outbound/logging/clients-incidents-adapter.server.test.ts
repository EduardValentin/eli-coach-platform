import { afterEach, describe, expect, it, vi } from "vitest";

import { ConsoleLoggerAdapter } from "~/shared/logging/console-logger-adapter.server";

import { ClientsIncidentsAdapter } from "./clients-incidents-adapter.server";

describe("createClientsIncidents", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs an unreadable client roster by error class only, never the failed query", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const clientsIncidentsAdapter = new ClientsIncidentsAdapter(
      new ConsoleLoggerAdapter(),
    );

    // act
    clientsIncidentsAdapter.rosterReadFailed(
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
    const clientsIncidentsAdapter = new ClientsIncidentsAdapter(
      new ConsoleLoggerAdapter(),
    );

    // act
    clientsIncidentsAdapter.rosterReadFailed("database down");

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
