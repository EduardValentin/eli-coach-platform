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

  it("logs a paid session no payment handler serves with its purpose", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const logger = createConsoleLogger();

    // act
    logger.paymentEventUnrouted({ eventId: "evt_1", purpose: "gift-card" });

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Payment event matched no payment handler.",
      {
        errorCategory: "payment_event_unrouted",
        eventId: "evt_1",
        purpose: "gift-card",
      },
    );
  });

  it("logs a failed client invitation email by invitation id only", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const logger = createConsoleLogger();

    // act
    logger.invitationEmailFailed({
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

  it("logs a failed payment event handler by event, purpose and error class only", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const logger = createConsoleLogger();

    // act
    logger.paymentEventHandlingFailed({
      errorClass: "DrizzleQueryError",
      eventId: "evt_1",
      purpose: "coaching-subscription",
    });

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Payment event handler failed; Stripe will redeliver.",
      {
        errorCategory: "payment_event_handling_failure",
        errorClass: "DrizzleQueryError",
        eventId: "evt_1",
        purpose: "coaching-subscription",
      },
    );
  });

  it("logs a saved onboarding draft by client and form only", () => {
    // arrange
    const consoleInfo = vi
      .spyOn(console, "info")
      .mockImplementation(() => undefined);
    const logger = createConsoleLogger();

    // act
    logger.onboardingDraftSaved({
      clientId: "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22",
      formId: "safety-screening",
    });

    // assert
    expect(consoleInfo).toHaveBeenCalledWith("Client onboarding draft saved.", {
      clientId: "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22",
      eventCategory: "client_onboarding_draft_saved",
      formId: "safety-screening",
    });
  });

  it("logs a failed onboarding draft save by client and form only", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const logger = createConsoleLogger();

    // act
    logger.onboardingDraftSaveFailed({
      clientId: "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22",
      formId: "measurements",
    });

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Client onboarding draft save failed.",
      {
        clientId: "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22",
        errorCategory: "client_onboarding_draft_save_failure",
        formId: "measurements",
      },
    );
  });

  it("logs an accepted onboarding submission by client and screening outcome only", () => {
    // arrange
    const consoleInfo = vi
      .spyOn(console, "info")
      .mockImplementation(() => undefined);
    const logger = createConsoleLogger();

    // act
    logger.onboardingSubmissionAccepted({
      clientId: "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22",
      screeningOutcome: "needs-review",
    });

    // assert
    expect(consoleInfo).toHaveBeenCalledWith(
      "Client onboarding submission accepted.",
      {
        clientId: "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22",
        eventCategory: "client_onboarding_submission_accepted",
        screeningOutcome: "needs-review",
      },
    );
  });

  it("logs a refused onboarding submission by client and reason only", () => {
    // arrange
    const consoleWarn = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    const logger = createConsoleLogger();

    // act
    logger.onboardingSubmissionRefused({
      clientId: "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22",
      reason: "invalid",
    });

    // assert
    expect(consoleWarn).toHaveBeenCalledWith(
      "Client onboarding submission refused.",
      {
        clientId: "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22",
        eventCategory: "client_onboarding_submission_refused",
        reason: "invalid",
      },
    );
  });

  it("logs an unreadable client roster by error class only, never the failed query", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const logger = createConsoleLogger();

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
    const logger = createConsoleLogger();

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

  it("logs a re-sent client invitation by invitation id only", () => {
    // arrange
    const consoleInfo = vi
      .spyOn(console, "info")
      .mockImplementation(() => undefined);
    const logger = createConsoleLogger();

    // act
    logger.invitationResent({ invitationId: "invitation-1" });

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
    const logger = createConsoleLogger();

    // act
    logger.invitationResendFailed({
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

  it("logs a saved measurement entry by client and entry only, never its values", () => {
    // arrange
    const consoleInfo = vi
      .spyOn(console, "info")
      .mockImplementation(() => undefined);
    const logger = createConsoleLogger();

    // act
    logger.measurementEntrySaved({ clientId: "client-1", entryId: "entry-1" });

    // assert
    expect(consoleInfo).toHaveBeenCalledWith("Measurement entry saved.", {
      clientId: "client-1",
      entryId: "entry-1",
      eventCategory: "measurement_entry_saved",
    });
  });

  it("logs a stored progress photo by ids, view and byte counts only", () => {
    // arrange
    const consoleInfo = vi
      .spyOn(console, "info")
      .mockImplementation(() => undefined);
    const logger = createConsoleLogger();

    // act
    logger.progressPhotoStored({
      clientId: "client-1",
      entryId: "entry-1",
      view: "front",
      receivedBytes: 4_182_000,
      storedBytes: 312_400,
    });

    // assert
    expect(consoleInfo).toHaveBeenCalledWith("Progress photo stored.", {
      clientId: "client-1",
      entryId: "entry-1",
      eventCategory: "progress_photo_stored",
      receivedBytes: 4_182_000,
      storedBytes: 312_400,
      view: "front",
    });
  });

  it("logs a refused progress photo by ids, view, byte count and reason only", () => {
    // arrange
    const consoleWarn = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    const logger = createConsoleLogger();

    // act
    logger.progressPhotoRefused({
      clientId: "client-1",
      entryId: "entry-1",
      view: "side",
      receivedBytes: 12,
      reason: "rendition-refused",
    });

    // assert
    expect(consoleWarn).toHaveBeenCalledWith("Progress photo refused.", {
      clientId: "client-1",
      entryId: "entry-1",
      eventCategory: "progress_photo_refused",
      reason: "rendition-refused",
      receivedBytes: 12,
      view: "side",
    });
  });

  it("logs a deleted progress photo by ids and view only", () => {
    // arrange
    const consoleInfo = vi
      .spyOn(console, "info")
      .mockImplementation(() => undefined);
    const logger = createConsoleLogger();

    // act
    logger.progressPhotoDeleted({
      clientId: "client-1",
      entryId: "entry-1",
      photoId: "photo-1",
      view: "back",
    });

    // assert
    expect(consoleInfo).toHaveBeenCalledWith("Progress photo deleted.", {
      clientId: "client-1",
      entryId: "entry-1",
      eventCategory: "progress_photo_deleted",
      photoId: "photo-1",
      view: "back",
    });
  });

  it("logs a refused progress photo request by requester role and photo only", () => {
    // arrange
    const consoleWarn = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    const logger = createConsoleLogger();

    // act
    logger.progressPhotoAccessRefused({
      requesterRole: "CLIENT",
      photoId: "photo-1",
    });

    // assert
    expect(consoleWarn).toHaveBeenCalledWith("Progress photo access refused.", {
      eventCategory: "progress_photo_access_refused",
      photoId: "photo-1",
      requesterRole: "CLIENT",
    });
  });
});
