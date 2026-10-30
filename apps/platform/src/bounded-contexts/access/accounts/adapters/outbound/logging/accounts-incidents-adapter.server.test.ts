import { afterEach, describe, expect, it, vi } from "vitest";

import { ConsoleLoggerAdapter } from "~/shared/logging/console-logger-adapter.server";

import { AccountsIncidentsAdapter } from "./accounts-incidents-adapter.server";

describe("createAccountsIncidents", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs a failed client invitation email by invitation id only", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const accountsIncidentsAdapter = new AccountsIncidentsAdapter(
      new ConsoleLoggerAdapter(),
    );

    // act
    accountsIncidentsAdapter.invitationEmailFailed({
      invitationId: "5b1c7a52-8f4f-4e5a-a2b7-5c3f6a9c1d22",
    });

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Client invitation email failed.",
      {
        errorCategory: "client_invitation_email_failure",
        invitationId: "5b1c7a52-8f4f-4e5a-a2b7-5c3f6a9c1d22",
      },
    );
  });

  it("logs a re-sent client invitation by invitation id only", () => {
    // arrange
    const consoleInfo = vi
      .spyOn(console, "info")
      .mockImplementation(() => undefined);
    const accountsIncidentsAdapter = new AccountsIncidentsAdapter(
      new ConsoleLoggerAdapter(),
    );

    // act
    accountsIncidentsAdapter.invitationResent({ invitationId: "invitation-1" });

    // assert
    expect(consoleInfo).toHaveBeenCalledWith("Client invitation re-sent.", {
      eventCategory: "client_invitation_resent",
      invitationId: "invitation-1",
    });
  });

  it("logs a failed client invitation re-send by invitation id and step only", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const accountsIncidentsAdapter = new AccountsIncidentsAdapter(
      new ConsoleLoggerAdapter(),
    );

    // act
    accountsIncidentsAdapter.invitationResendFailed({
      invitationId: "invitation-1",
      step: "provider",
    });

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Client invitation re-send failed.",
      {
        errorCategory: "client_invitation_resend_failure",
        invitationId: "invitation-1",
        step: "provider",
      },
    );
  });
});
