import { data } from "react-router";

import type {
  DeliverOrderEmailUseCase,
  PrepareOrderEmailResendUseCase,
  ReadOrderConfirmationUseCase,
} from "~/bounded-contexts/sales/store/domain/order";
import { STORE_CHECKOUT_SESSION_PARAM } from "~/bounded-contexts/sales/store/public/paths";
import {
  storeCheckoutSessionIdSchema,
  storeOrderConfirmationSchema,
  storeOrderEmailResendRequestSchema,
  storeOrderEmailResendResponseSchema,
} from "~/bounded-contexts/sales/store/public/store-orders";
import { readFormDataRequestBody } from "~/shared/http/index.server";

const CONFIRMATION_PAGE_HEADERS = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
};
const MAX_RESEND_BODY_BYTES = 1024;
const RESEND_UNAVAILABLE_MESSAGE = "Unable to send the order email.";
const INVALID_RESEND_MESSAGE = "The order email request could not be read.";

type StoreOrderControllerOptions = {
  readOrderConfirmationUseCase: ReadOrderConfirmationUseCase;
  prepareOrderEmailResendUseCase: PrepareOrderEmailResendUseCase;
  deliverOrderEmailUseCase: DeliverOrderEmailUseCase;
};

export class StoreOrderController {
  constructor(private readonly options: StoreOrderControllerOptions) {}

  async loadConfirmation(url: URL) {
    const sessionId = storeCheckoutSessionIdSchema.safeParse(
      url.searchParams.get(STORE_CHECKOUT_SESSION_PARAM),
    );
    const page = sessionId.success
      ? await this.readConfirmation(sessionId.data)
      : { status: "not_completed" };

    return data(storeOrderConfirmationSchema.parse(page), {
      headers: CONFIRMATION_PAGE_HEADERS,
    });
  }

  async resendEmail(request: Request): Promise<Response> {
    const body = await readFormDataRequestBody(request, {
      maxBytes: MAX_RESEND_BODY_BYTES,
    });
    const submission = storeOrderEmailResendRequestSchema.safeParse(
      body.status === "valid" ? Object.fromEntries(body.formData) : null,
    );

    if (!submission.success) {
      return this.failure("invalid_request", 400);
    }

    const prepared = await this.options.prepareOrderEmailResendUseCase.execute(
      submission.data.sessionId,
    );

    if (prepared.status !== "prepared") {
      return this.outcome(prepared.status);
    }

    const delivered = await this.options.deliverOrderEmailUseCase.execute(
      prepared.delivery,
    );

    return delivered === "sent"
      ? this.outcome("sent")
      : this.failure("resend_unavailable", 503);
  }

  private async readConfirmation(sessionId: string) {
    const read =
      await this.options.readOrderConfirmationUseCase.execute(sessionId);

    return read.status === "confirmed"
      ? { status: read.status, sessionId, ...read.confirmation }
      : read;
  }

  private outcome(
    outcome: "sent" | "processing" | "rate_limited" | "not_found",
  ): Response {
    return Response.json(
      storeOrderEmailResendResponseSchema.parse({ success: true, outcome }),
    );
  }

  private failure(
    code: "invalid_request" | "resend_unavailable",
    status: number,
  ): Response {
    return Response.json(
      storeOrderEmailResendResponseSchema.parse({
        success: false,
        error: {
          code,
          message:
            code === "invalid_request"
              ? INVALID_RESEND_MESSAGE
              : RESEND_UNAVAILABLE_MESSAGE,
        },
      }),
      { status },
    );
  }
}
