import { afterEach, describe, expect, it, vi } from "vitest";

import { createConsoleLogger } from "./logger.server";

describe("createConsoleLogger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs rejected product delivery without recipient data", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const logger = createConsoleLogger();

    // act
    logger.deliveryRejected({
      reason: "invalid_from_address",
      requestId: 31,
    });

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Store delivery provider rejected the request.",
      {
        errorCategory: "store_delivery_rejected",
        providerRejectionReason: "invalid_from_address",
        requestId: 31,
      },
    );
  });

  it("logs a pending product delivery acceptance audit", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const logger = createConsoleLogger();

    // act
    logger.deliveryAcceptanceAuditPending({ requestId: 31 });

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Store delivery acceptance audit requires reconciliation.",
      {
        errorCategory: "store_delivery_acceptance_audit_pending",
        requestId: 31,
      },
    );
  });

  it("logs a pending retryable product delivery audit", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const logger = createConsoleLogger();

    // act
    logger.retryableDeliveryAuditPending({ requestId: 31 });

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Store retryable delivery audit requires reconciliation.",
      {
        errorCategory: "store_delivery_retryable_audit_pending",
        requestId: 31,
      },
    );
  });

  it("logs waitlist confirmation delivery failure without recipient data", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const logger = createConsoleLogger();

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
    const logger = createConsoleLogger();

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
