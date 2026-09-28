import {
  createBadRequestResponse,
  readTextRequestBody,
} from "@eli-coach-platform/infrastructure/http/server";
import {
  PAYMENT_PURPOSE_METADATA_KEY,
  type PaidCheckoutSession,
  type PaymentCompletionHandler,
  type PaymentEvents,
  type PaymentWebhookIncidents,
} from "@eli-coach-platform/infrastructure/payments/server";

type StripeWebhookControllerOptions = {
  handlersByPurpose: ReadonlyMap<string, PaymentCompletionHandler>;
  incidents: PaymentWebhookIncidents;
  paymentEvents: PaymentEvents;
  signingSecret: string | undefined;
};

const SIGNATURE_HEADER = "stripe-signature";
const EVENT_MAX_BYTES = 512 * 1024;
const PAYLOAD_TOO_LARGE = 413;
const HANDLER_FAILED = 500;

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

    if (verdict.kind === "invalid") {
      return createBadRequestResponse(
        "Unable to verify the payment event signature.",
      );
    }

    if (verdict.kind === "checkout_completed") {
      return this.routePaidSession(verdict.eventId, verdict.session);
    }

    return acknowledged();
  }

  private async routePaidSession(
    eventId: string,
    session: PaidCheckoutSession,
  ): Promise<Response> {
    const purpose = session.metadata[PAYMENT_PURPOSE_METADATA_KEY] ?? null;
    const handler = purpose
      ? this.options.handlersByPurpose.get(purpose)
      : undefined;

    if (!purpose || !handler) {
      this.options.incidents.paymentEventUnrouted({ eventId, purpose });
      return acknowledged();
    }

    return handler.handle(eventId, session).then(acknowledged, (error) => {
      this.options.incidents.paymentEventHandlingFailed({
        errorClass: errorClassOf(error),
        eventId,
        purpose,
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
