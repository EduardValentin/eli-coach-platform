import {
  createBadRequestResponse,
  readTextRequestBody,
} from "@eli-coach-platform/infrastructure/http/server";
import {
  PAYMENT_PURPOSE_METADATA_KEY,
  type PaidCheckoutSession,
  type PaymentCompletionHandler,
  type PaymentEvents,
  type PaymentRefund,
  type PaymentRefundHandler,
  type PaymentSubscriptionChange,
  type PaymentSubscriptionChangeHandler,
  type PaymentWebhookIncidents,
} from "@eli-coach-platform/infrastructure/payments/server";

type StripeWebhookControllerOptions = {
  completionHandlersByPurpose: ReadonlyMap<string, PaymentCompletionHandler>;
  incidents: PaymentWebhookIncidents;
  paymentEvents: PaymentEvents;
  refundHandler: PaymentRefundHandler;
  signingSecret: string | undefined;
  subscriptionChangeHandlersByPurpose: ReadonlyMap<
    string,
    PaymentSubscriptionChangeHandler
  >;
};

type Delivery = {
  eventId: string;
  purpose: string;
  handle: () => Promise<unknown>;
};

const SIGNATURE_HEADER = "stripe-signature";
const EVENT_MAX_BYTES = 512 * 1024;
const PAYLOAD_TOO_LARGE = 413;
const HANDLER_FAILED = 500;
const REFUND_OWNER = "refund";

export class StripeWebhookController {
  constructor(private readonly options: StripeWebhookControllerOptions) {}

  async handleEvent(request: Request): Promise<Response> {
    if (!this.options.signingSecret) {
      return new Response(null, { status: 503 });
    }

    const body = await readTextRequestBody(request, {
      maxBytes: EVENT_MAX_BYTES,
    });

    if (body.status === "too_large") {
      return new Response(null, { status: PAYLOAD_TOO_LARGE });
    }

    const verdict = await this.options.paymentEvents.verify(
      body.text,
      request.headers.get(SIGNATURE_HEADER),
    );

    switch (verdict.kind) {
      case "invalid":
        return createBadRequestResponse(
          "Unable to verify the payment event signature.",
        );
      case "checkout_completed":
        return this.routePaidSession(verdict.eventId, verdict.session);
      case "subscription_changed":
        return this.routeSubscriptionChange(verdict);
      case "charge_refunded":
        return this.deliverRefund(verdict.eventId, verdict.refund);
      case "ignored":
        return acknowledged();
    }
  }

  private routePaidSession(
    eventId: string,
    session: PaidCheckoutSession,
  ): Promise<Response> {
    const purpose = session.metadata[PAYMENT_PURPOSE_METADATA_KEY] ?? null;
    const handler = purpose
      ? this.options.completionHandlersByPurpose.get(purpose)
      : undefined;

    if (!purpose || !handler) {
      return this.unrouted(eventId, purpose);
    }

    return this.deliver({
      eventId,
      purpose,
      handle: () => handler.handle(eventId, session),
    });
  }

  private routeSubscriptionChange(verdict: {
    eventId: string;
    purpose: string | null;
    change: PaymentSubscriptionChange;
  }): Promise<Response> {
    const { eventId, purpose, change } = verdict;
    const handler = purpose
      ? this.options.subscriptionChangeHandlersByPurpose.get(purpose)
      : undefined;

    if (!purpose || !handler) {
      return this.unrouted(eventId, purpose);
    }

    return this.deliver({
      eventId,
      purpose,
      handle: () => handler.handle(eventId, change),
    });
  }

  private deliverRefund(
    eventId: string,
    refund: PaymentRefund,
  ): Promise<Response> {
    return this.deliver({
      eventId,
      purpose: REFUND_OWNER,
      handle: () => this.options.refundHandler.handle(eventId, refund),
    });
  }

  private async unrouted(
    eventId: string,
    purpose: string | null,
  ): Promise<Response> {
    this.options.incidents.paymentEventUnrouted({ eventId, purpose });

    return acknowledged();
  }

  private deliver(delivery: Delivery): Promise<Response> {
    return delivery.handle().then(acknowledged, (error) => {
      this.options.incidents.paymentEventHandlingFailed({
        errorClass: errorClassOf(error),
        eventId: delivery.eventId,
        purpose: delivery.purpose,
      });

      return new Response(null, { status: HANDLER_FAILED });
    });
  }
}

function acknowledged(): Response {
  return new Response(null, { status: 200 });
}

function errorClassOf(error: unknown): string {
  return error instanceof Error ? error.name : typeof error;
}
