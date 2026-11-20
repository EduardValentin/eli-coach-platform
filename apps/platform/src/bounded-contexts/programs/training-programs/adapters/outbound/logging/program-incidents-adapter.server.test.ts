import { afterEach, describe, expect, it, vi } from "vitest";

import { ConsoleLoggerAdapter } from "~/shared/logging/console-logger-adapter.server";

import { ProgramIncidentsAdapter } from "./program-incidents-adapter.server";

describe("ProgramIncidentsAdapter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs a program that could not be started by client and the class and code of its cause only", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const programIncidentsAdapter = new ProgramIncidentsAdapter(
      new ConsoleLoggerAdapter(),
    );
    const cause = Object.assign(new Error("secret row contents"), {
      code: "ECONNREFUSED",
    });

    // act
    programIncidentsAdapter.programStartFailed({
      clientId: "client-1",
      error: cause,
    });

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Program could not be started; nothing was saved.",
      {
        clientId: "client-1",
        errorCategory: "program_start_failure",
        errorClass: "Error",
        errorCode: "ECONNREFUSED",
      },
    );
  });
});
