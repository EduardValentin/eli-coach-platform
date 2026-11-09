import type { PaymentWebhookIncidentsPort } from "~/bounded-contexts/sales/shared/payments/adapters/inbound/http/payment-webhook-incidents-port.server";
import type { LoggerPort } from "~/shared/logging/logger-port.server";
import { errorClassOf } from "~/shared/logging/error-fields.server";

export class PaymentWebhookIncidentsAdapter implements PaymentWebhookIncidentsPort {
  constructor(private readonly loggerPort: LoggerPort) {}

  paymentEventHandlingFailed({
    error,
    eventId,
    handler,
  }: {
    error: unknown;
    eventId: string;
    handler: string;
  }) {
    this.loggerPort.error(
      "Payment event handler failed; Stripe will redeliver.",
      {
        errorCategory: "payment_event_handling_failure",
        errorClass: errorClassOf(error),
        eventId,
        handler,
      },
    );
  }

  paymentEventUnrouted({
    eventId,
    purpose,
  }: {
    eventId: string;
    purpose: string | null;
  }) {
    this.loggerPort.error("Payment event matched no payment handler.", {
      errorCategory: "payment_event_unrouted",
      eventId,
      purpose,
    });
  }
}
