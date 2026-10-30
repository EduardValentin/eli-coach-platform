import {
  createBadRequestResponse,
  readTextRequestBody,
} from "~/shared/http/index.server";
import type { UnitOfWork } from "~/shared/http/unit-of-work";
import { PAYMENT_PURPOSE_METADATA_KEY } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/payments/payment-completion-handler.server";
import { type PaymentCompletionHandlerPort } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/payments/payment-completion-handler-port.server";
import type {
  PaidCheckoutSession,
  PaymentCardChange,
  PaymentRefund,
  PaymentSubscriptionChange,
} from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/payments/payment-event-types.server";
import type { PaymentRefundHandlerPort } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/payments/payment-refund-handler-port.server";
import type { PaymentSubscriptionChangeHandlerPort } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/payments/payment-subscription-change-handler-port.server";
import type { PaymentCardHandlerPort } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/payments/payment-card-handler-port.server";
import type { PaymentEventsPort } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/payments/payment-events-port.server";
import type { PaymentWebhookIncidentsPort } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/payments/payment-webhook-incidents-port.server";

type StripeWebhookControllerOptions = {
  paymentCardHandlerPort: PaymentCardHandlerPort;
  completionHandlersByPurpose: ReadonlyMap<
    string,
    PaymentCompletionHandlerPort
  >;
  paymentWebhookIncidentsPort: PaymentWebhookIncidentsPort;
  paymentEventsPort: PaymentEventsPort;
  paymentRefundHandlerPort: PaymentRefundHandlerPort;
  signingSecret: string | undefined;
  subscriptionChangeHandlersByPurpose: ReadonlyMap<
    string,
    PaymentSubscriptionChangeHandlerPort
  >;
  unitOfWork: UnitOfWork;
};

type Delivery = {
  eventId: string;
  handler: string;
  handle: () => Promise<unknown>;
};

type PurposeRouting<Handler> = {
  eventId: string;
  purpose: string | null;
  handlersByPurpose: ReadonlyMap<string, Handler>;
};

const SIGNATURE_HEADER = "stripe-signature";
const EVENT_MAX_BYTES = 512 * 1024;
const PAYLOAD_TOO_LARGE = 413;
const HANDLER_FAILED = 500;
const REFUNDS_HANDLER = "charge-refunds";
const CARDS_HANDLER = "payment-cards";

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

    const verdict = await this.options.paymentEventsPort.verify(
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
      case "payment_method_changed":
        return this.deliverCardChange(verdict.eventId, verdict.change);
      case "ignored":
        return acknowledged();
    }
  }

  private routePaidSession(
    eventId: string,
    session: PaidCheckoutSession,
  ): Promise<Response> {
    return this.routeByPurpose(
      {
        eventId,
        purpose: session.metadata[PAYMENT_PURPOSE_METADATA_KEY] ?? null,
        handlersByPurpose: this.options.completionHandlersByPurpose,
      },
      (paymentCompletionHandlerPort) =>
        paymentCompletionHandlerPort.handle(eventId, session),
    );
  }

  private routeSubscriptionChange(verdict: {
    eventId: string;
    purpose: string | null;
    change: PaymentSubscriptionChange;
  }): Promise<Response> {
    return this.routeByPurpose(
      {
        eventId: verdict.eventId,
        purpose: verdict.purpose,
        handlersByPurpose: this.options.subscriptionChangeHandlersByPurpose,
      },
      (paymentSubscriptionChangeHandlerPort) =>
        this.options.unitOfWork(() =>
          paymentSubscriptionChangeHandlerPort.handle(
            verdict.eventId,
            verdict.change,
          ),
        ),
    );
  }

  private routeByPurpose<Handler>(
    routing: PurposeRouting<Handler>,
    handle: (handler: Handler) => Promise<unknown>,
  ): Promise<Response> {
    const { eventId, purpose } = routing;
    const handler = purpose
      ? routing.handlersByPurpose.get(purpose)
      : undefined;

    if (!purpose || !handler) {
      return this.unrouted(eventId, purpose);
    }

    return this.deliver({
      eventId,
      handler: purpose,
      handle: () => handle(handler),
    });
  }

  private deliverRefund(
    eventId: string,
    refund: PaymentRefund,
  ): Promise<Response> {
    return this.deliver({
      eventId,
      handler: REFUNDS_HANDLER,
      handle: () =>
        this.options.unitOfWork(() =>
          this.options.paymentRefundHandlerPort.handle(eventId, refund),
        ),
    });
  }

  private deliverCardChange(
    eventId: string,
    change: PaymentCardChange,
  ): Promise<Response> {
    return this.deliver({
      eventId,
      handler: CARDS_HANDLER,
      handle: () =>
        this.options.unitOfWork(() =>
          this.options.paymentCardHandlerPort.handle(eventId, change),
        ),
    });
  }

  private async unrouted(
    eventId: string,
    purpose: string | null,
  ): Promise<Response> {
    this.options.paymentWebhookIncidentsPort.paymentEventUnrouted({
      eventId,
      purpose,
    });

    return acknowledged();
  }

  private deliver(delivery: Delivery): Promise<Response> {
    return delivery.handle().then(acknowledged, (error) => {
      this.options.paymentWebhookIncidentsPort.paymentEventHandlingFailed({
        error,
        eventId: delivery.eventId,
        handler: delivery.handler,
      });

      return new Response(null, { status: HANDLER_FAILED });
    });
  }
}

function acknowledged(): Response {
  return new Response(null, { status: 200 });
}
