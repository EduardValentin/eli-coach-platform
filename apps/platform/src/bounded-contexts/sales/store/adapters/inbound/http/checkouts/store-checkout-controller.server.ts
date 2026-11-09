import type {
  PlaceOrderResult,
  PlaceOrderUseCase,
} from "~/bounded-contexts/sales/store/domain/order";
import {
  STORE_CHECKOUT_COMPLETE_PATH,
  STORE_CHECKOUT_SESSION_PARAM,
  STORE_PAYMENT_CANCELLED,
  STORE_PAYMENT_PARAM,
} from "~/bounded-contexts/sales/store/public/paths";
import {
  storeCheckoutRequestSchema,
  storeCheckoutResponseSchema,
  type StoreCheckoutErrorCode,
} from "~/bounded-contexts/sales/store/public/store-orders";
import { STORE_PATH } from "~/bounded-contexts/sales/public/paths";
import { joinBasePath } from "~/shared/http/base-path";
import { readFormDataRequestBody } from "~/shared/http/index.server";
import {
  STORE_ACQUISITION_TURNSTILE_ACTION,
  TURNSTILE_RESPONSE_FIELD,
} from "~/shared/submission-checks/bot-detection";
import {
  resolveRequestRemoteIp,
  type BotVerifierPort,
} from "~/shared/submission-checks/bot-detection/index.server";

const ERROR_MESSAGE = "Unable to start the checkout.";
const MAX_CHECKOUT_BODY_BYTES = 16 * 1024;
const CHECKOUT_SESSION_ID_PLACEHOLDER = "{CHECKOUT_SESSION_ID}";

type Refusal = Exclude<PlaceOrderResult, { status: "opened" | "paid" }>;

const REFUSAL_STATUSES: Record<Refusal["status"], number> = {
  subaddress_refused: 422,
  unavailable_products: 409,
  no_paid_items: 409,
  idempotency_conflict: 409,
  checkout_unavailable: 503,
};

type StoreCheckoutControllerOptions = {
  appBasePath: string;
  botVerifierPort: BotVerifierPort;
  placeOrderUseCase: PlaceOrderUseCase;
  publicAppUrl: string;
};

export class StoreCheckoutController {
  constructor(private readonly options: StoreCheckoutControllerOptions) {}

  async placeOrder(request: Request): Promise<Response> {
    const body = await readFormDataRequestBody(request, {
      maxBytes: MAX_CHECKOUT_BODY_BYTES,
    });

    if (body.status !== "valid") {
      return this.errorResponse(
        "invalid_request",
        body.status === "too_large" ? 413 : 400,
      );
    }

    const submission = storeCheckoutRequestSchema.safeParse(
      Object.fromEntries(body.formData),
    );

    if (!submission.success) {
      return this.errorResponse("invalid_request", 400);
    }

    const verification = await this.options.botVerifierPort.verifySubmission({
      action: STORE_ACQUISITION_TURNSTILE_ACTION,
      remoteIp: resolveRequestRemoteIp(request),
      token: submission.data[TURNSTILE_RESPONSE_FIELD] ?? null,
    });

    if (verification.status === "unavailable") {
      return this.errorResponse("checkout_unavailable", 503);
    }

    if (verification.status === "rejected") {
      return this.errorResponse("bot_verification_failed", 400);
    }

    try {
      return this.checkoutResponse(
        await this.options.placeOrderUseCase.execute({
          email: submission.data.email,
          idempotencyKey: submission.data.idempotencyKey,
          productSlugs: submission.data.productSlugs,
          currency: submission.data.currency,
          marketingConsent: submission.data.marketingConsent,
          successUrl: this.successUrl(),
          cancelUrl: this.cancelUrl(),
        }),
      );
    } catch (error) {
      console.error("Store checkout could not be started.", {
        errorCategory: "store_checkout_failure",
        errorName: error instanceof Error ? error.name : "unknown",
      });

      return this.errorResponse("checkout_unavailable", 503);
    }
  }

  private checkoutResponse(result: PlaceOrderResult): Response {
    if (result.status === "opened") {
      return this.openedResponse(result.checkoutUrl);
    }

    if (result.status === "paid") {
      return this.openedResponse(this.completeUrlFor(result.checkoutSessionId));
    }

    if (result.status === "unavailable_products") {
      return this.errorResponse(
        result.status,
        REFUSAL_STATUSES[result.status],
        result.availableProductSlugs,
      );
    }

    return this.errorResponse(result.status, REFUSAL_STATUSES[result.status]);
  }

  private openedResponse(checkoutUrl: string): Response {
    return Response.json(
      storeCheckoutResponseSchema.parse({ success: true, checkoutUrl }),
      { status: 201 },
    );
  }

  private errorResponse(
    code: StoreCheckoutErrorCode,
    status: number,
    availableProductSlugs?: readonly string[],
  ): Response {
    return Response.json(
      storeCheckoutResponseSchema.parse({
        success: false,
        error: { code, message: ERROR_MESSAGE, availableProductSlugs },
      }),
      { status },
    );
  }

  private successUrl(): string {
    return `${this.publicUrl(STORE_CHECKOUT_COMPLETE_PATH)}?${STORE_CHECKOUT_SESSION_PARAM}=${CHECKOUT_SESSION_ID_PLACEHOLDER}`;
  }

  private cancelUrl(): string {
    return `${this.publicUrl(STORE_PATH)}?${new URLSearchParams({ [STORE_PAYMENT_PARAM]: STORE_PAYMENT_CANCELLED })}`;
  }

  private completeUrlFor(checkoutSessionId: string): string {
    return `${this.publicUrl(STORE_CHECKOUT_COMPLETE_PATH)}?${new URLSearchParams({ [STORE_CHECKOUT_SESSION_PARAM]: checkoutSessionId })}`;
  }

  private publicUrl(path: string): string {
    return new URL(
      joinBasePath(this.options.appBasePath, path),
      this.options.publicAppUrl,
    ).toString();
  }
}
