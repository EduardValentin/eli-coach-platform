import { afterEach, describe, expect, it, vi } from "vitest";

import { ConsoleLoggerAdapter } from "~/shared/logging/console-logger-adapter.server";

import { PaymentWebhookIncidentsAdapter } from "./payment-webhook-incidents-adapter.server";

describe("PaymentWebhookIncidentsAdapter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs a paid session no payment handler serves with its purpose", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const paymentWebhookIncidentsAdapter = new PaymentWebhookIncidentsAdapter(
      new ConsoleLoggerAdapter(),
    );

    // act
    paymentWebhookIncidentsAdapter.paymentEventUnrouted({
      eventId: "evt_1",
      purpose: "gift-card",
    });

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
    const paymentWebhookIncidentsAdapter = new PaymentWebhookIncidentsAdapter(
      new ConsoleLoggerAdapter(),
    );

    // act
    paymentWebhookIncidentsAdapter.paymentEventHandlingFailed({
      error: Object.assign(new Error("relation is locked"), {
        name: "DrizzleQueryError",
      }),
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
});
