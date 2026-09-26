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

  it("logs a failed assessment call booking mode read", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const logger = createConsoleLogger();

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
    const logger = createConsoleLogger();

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
    const logger = createConsoleLogger();

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

  it("logs an unreadable coaching sales mode by error class and message only", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const logger = createConsoleLogger();
    const failure = Object.assign(new TypeError("flags unreadable"), {
      detail: "token=secret",
    });

    // act
    logger.salesModeReadFailed(failure);

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Coaching sales mode feature flag read failed.",
      {
        errorCategory: "coaching_sales_mode_read_failure",
        errorClass: "TypeError",
        errorMessage: "flags unreadable",
      },
    );
  });

  it("logs an unreadable coaching sales mode that failed without an error", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const logger = createConsoleLogger();

    // act
    logger.salesModeReadFailed("unreadable");

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Coaching sales mode feature flag read failed.",
      {
        errorCategory: "coaching_sales_mode_read_failure",
        errorClass: "string",
      },
    );
  });

  it("logs an undelivered payment link email by call", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const logger = createConsoleLogger();

    // act
    logger.paymentLinkEmailFailed("4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11");

    // assert
    expect(consoleError).toHaveBeenCalledWith("Payment link email failed.", {
      assessmentCallId: "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11",
      errorCategory: "payment_link_email_failure",
    });
  });

  it("logs a rejected payment event with its reason", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const logger = createConsoleLogger();

    // act
    logger.paymentEventRejected({
      eventId: "evt_1",
      reason: "call_already_paid",
    });

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Payment event was not recorded.",
      {
        errorCategory: "payment_event_rejected",
        eventId: "evt_1",
        reason: "call_already_paid",
      },
    );
  });
});
