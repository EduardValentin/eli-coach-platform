import type { RecordCheckoutCompletedUseCase } from "@eli-coach-platform/domain/coaching-subscription";
import {
  createBadRequestResponse,
  readTextRequestBody,
} from "@eli-coach-platform/infrastructure/http/server";
import type { PaymentEvents } from "@eli-coach-platform/infrastructure/payments/server";

type StripeWebhookControllerOptions = {
  paymentEvents: PaymentEvents;
  recordCheckoutCompleted: RecordCheckoutCompletedUseCase;
  signingSecret: string | undefined;
};

const SIGNATURE_HEADER = "stripe-signature";
const EVENT_MAX_BYTES = 512 * 1024;
const PAYLOAD_TOO_LARGE = 413;

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
      await this.options.recordCheckoutCompleted.execute({
        ...verdict.completion,
        eventId: verdict.eventId,
      });
    }

    return new Response(null, { status: 200 });
  }
}
