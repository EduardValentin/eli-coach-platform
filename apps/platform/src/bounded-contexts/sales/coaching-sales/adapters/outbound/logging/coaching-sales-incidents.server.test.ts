import { afterEach, describe, expect, it, vi } from "vitest";

import { createConsoleLogger } from "~/shared/logging/console-logger.server";

import { createCoachingSalesIncidents } from "./coaching-sales-incidents.server";

describe("createCoachingSalesIncidents", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs a coaching end that did not reach the check-ins by subscription, client, end and error class only", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const logger = createCoachingSalesIncidents(createConsoleLogger());

    // act
    logger.coachingEndNotPropagated({
      subscriptionId: "subscription-1",
      clientId: "client-1",
      endsAt: new Date("2027-01-21T08:00:00.000Z"),
      error: new TypeError("connection reset"),
    });

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Coaching end did not reach the client's check-ins; their later check-ins stay booked.",
      {
        clientId: "client-1",
        endsAt: "2027-01-21T08:00:00.000Z",
        errorCategory: "coaching_end_propagation_failure",
        errorClass: "TypeError",
        subscriptionId: "subscription-1",
      },
    );
  });

  it("logs a coaching period that did not reach the check-ins by subscription, client and error class only", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const logger = createCoachingSalesIncidents(createConsoleLogger());

    // act
    logger.coachingPeriodNotPropagated({
      subscriptionId: "subscription-1",
      clientId: "client-1",
      error: new TypeError("connection reset"),
    });

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Coaching period did not reach the client's check-ins; her weekly check-in misses the new weeks.",
      {
        clientId: "client-1",
        errorCategory: "coaching_period_propagation_failure",
        errorClass: "TypeError",
        subscriptionId: "subscription-1",
      },
    );
  });

  it("logs a renewal hold that could not be lifted by payment subscription and error class only", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const logger = createCoachingSalesIncidents(createConsoleLogger());

    // act
    logger.renewalHoldLiftFailed({
      paymentSubscriptionId: "sub_1",
      error: new TypeError("provider down"),
    });

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Coaching subscription renewal hold could not be lifted; it ends at its resume date.",
      {
        errorCategory: "coaching_subscription_renewal_hold_lift_failure",
        errorClass: "TypeError",
        paymentSubscriptionId: "sub_1",
      },
    );
  });

  it("logs an unreadable coaching sales mode by error class and message only", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const logger = createCoachingSalesIncidents(createConsoleLogger());
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
    const logger = createCoachingSalesIncidents(createConsoleLogger());

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
    const logger = createCoachingSalesIncidents(createConsoleLogger());

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
    const logger = createCoachingSalesIncidents(createConsoleLogger());

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
    const logger = createCoachingSalesIncidents(createConsoleLogger());

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

  it("logs a failed payment event handler by event, handler and error class only", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const logger = createCoachingSalesIncidents(createConsoleLogger());

    // act
    logger.paymentEventHandlingFailed({
      errorClass: "DrizzleQueryError",
      eventId: "evt_1",
      handler: "coaching-subscription",
    });

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Payment event handler failed; Stripe will redeliver.",
      {
        errorCategory: "payment_event_handling_failure",
        errorClass: "DrizzleQueryError",
        eventId: "evt_1",
        handler: "coaching-subscription",
      },
    );
  });

  describe("coaching subscription incidents", () => {
    it.each([
      [
        "a cancellation with its rule and the refund due",
        "info",
        (logger: ReturnType<typeof createCoachingSalesIncidents>) =>
          logger.subscriptionCancelled({
            subscriptionId: "subscription-1",
            startChoice: "waiting",
            rule: "full-refund",
            refundDueCents: 44700,
          }),
        "Coaching subscription cancelled.",
        {
          eventCategory: "coaching_subscription_cancelled",
          refundDueCents: 44700,
          rule: "full-refund",
          startChoice: "waiting",
          subscriptionId: "subscription-1",
        },
      ],
      [
        "a cancellation the provider refused, by the failure's kind only",
        "error",
        (logger: ReturnType<typeof createCoachingSalesIncidents>) =>
          logger.subscriptionCancellationFailed({
            subscriptionId: "subscription-1",
            rule: "no-refund",
            error: new TypeError("ana@example.com sub_1 refused"),
          }),
        "Coaching subscription cancellation failed at the payment provider.",
        {
          errorCategory: "coaching_subscription_cancellation_failure",
          errorClass: "TypeError",
          rule: "no-refund",
          subscriptionId: "subscription-1",
        },
      ],
      [
        "a program started now",
        "info",
        (logger: ReturnType<typeof createCoachingSalesIncidents>) =>
          logger.programStartedNow({ subscriptionId: "subscription-1" }),
        "Coaching program started now.",
        {
          eventCategory: "coaching_program_started_now",
          subscriptionId: "subscription-1",
        },
      ],
      [
        "a reconciled provider event",
        "info",
        (logger: ReturnType<typeof createCoachingSalesIncidents>) =>
          logger.subscriptionEventReconciled({
            eventId: "evt_1",
            eventKind: "ended",
            paymentReference: "sub_1",
            outcome: "recorded",
          }),
        "Coaching subscription event reconciled.",
        {
          eventCategory: "coaching_subscription_event_reconciled",
          eventId: "evt_1",
          eventKind: "ended",
          outcome: "recorded",
          paymentReference: "sub_1",
        },
      ],
      [
        "a settled refund",
        "info",
        (logger: ReturnType<typeof createCoachingSalesIncidents>) =>
          logger.refundSettled({
            subscriptionId: "subscription-1",
            refundedCents: 44700,
          }),
        "Coaching subscription refund settled.",
        {
          eventCategory: "coaching_subscription_refund_settled",
          refundedCents: 44700,
          subscriptionId: "subscription-1",
        },
      ],
      [
        "an opened payment-method session",
        "info",
        (logger: ReturnType<typeof createCoachingSalesIncidents>) =>
          logger.paymentMethodSessionOpened({
            subscriptionId: "subscription-1",
          }),
        "Payment method session opened.",
        {
          eventCategory: "payment_method_session_opened",
          subscriptionId: "subscription-1",
        },
      ],
      [
        "an applied renewal hold",
        "info",
        (logger: ReturnType<typeof createCoachingSalesIncidents>) =>
          logger.renewalHoldApplied({ paymentSubscriptionId: "sub_1" }),
        "Coaching subscription renewal hold applied.",
        {
          eventCategory: "coaching_subscription_renewal_hold_applied",
          paymentSubscriptionId: "sub_1",
        },
      ],
      [
        "a failed renewal hold, by the failure's kind only",
        "error",
        (logger: ReturnType<typeof createCoachingSalesIncidents>) =>
          logger.renewalHoldFailed({
            paymentSubscriptionId: "sub_1",
            error: new RangeError("ana@example.com"),
          }),
        "Coaching subscription renewal hold failed; Stripe will redeliver.",
        {
          errorCategory: "coaching_subscription_renewal_hold_failure",
          errorClass: "RangeError",
          paymentSubscriptionId: "sub_1",
        },
      ],
      [
        "a mirrored card event by ids only",
        "info",
        (logger: ReturnType<typeof createCoachingSalesIncidents>) =>
          logger.paymentCardEventMirrored({
            eventId: "evt_card",
            eventKind: "card-attached",
            paymentCustomerId: "cus_1",
            outcome: "recorded",
          }),
        "Card on file mirrored.",
        {
          eventCategory: "payment_card_event_mirrored",
          eventId: "evt_card",
          eventKind: "card-attached",
          outcome: "recorded",
          paymentCustomerId: "cus_1",
        },
      ],
      [
        "a card on file that could not be mirrored, by the failure's kind only",
        "error",
        (logger: ReturnType<typeof createCoachingSalesIncidents>) =>
          logger.paymentCardRefreshFailed({
            paymentCustomerId: "cus_1",
            error: new TypeError("4242"),
          }),
        "Payment card could not be refreshed; Stripe will redeliver.",
        {
          errorCategory: "payment_card_mirror_failure",
          errorClass: "TypeError",
          paymentCustomerId: "cus_1",
        },
      ],
      [
        "a refund notice the coach did not get",
        "error",
        (logger: ReturnType<typeof createCoachingSalesIncidents>) =>
          logger.refundNotificationFailed({ subscriptionId: "subscription-1" }),
        "Refund due email to the coach failed.",
        {
          errorCategory: "coaching_subscription_refund_notification_failure",
          subscriptionId: "subscription-1",
        },
      ],
    ] as const)("logs %s", (_label, level, report, message, fields) => {
      // arrange
      const output = vi
        .spyOn(console, level)
        .mockImplementation(() => undefined);
      const logger = createCoachingSalesIncidents(createConsoleLogger());

      // act
      report(logger);

      // assert
      expect(output).toHaveBeenCalledWith(message, fields);
    });
  });
});
