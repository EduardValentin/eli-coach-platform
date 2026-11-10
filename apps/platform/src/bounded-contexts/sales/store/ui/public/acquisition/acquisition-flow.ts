import { EMAIL_SUBADDRESS_REFUSED_MESSAGE } from "~/shared/submission-checks/email-address-copy";
import type {
  StoreAcquisitionErrorCode,
  StoreAcquisitionResponse,
  StoreProduct,
} from "~/bounded-contexts/sales/store/public/store";
import type {
  StoreCheckoutErrorCode,
  StoreCheckoutResponse,
} from "~/bounded-contexts/sales/store/public/store-orders";

type StoreAcquisitionStep = "cart" | "details" | "success";

export type AcquisitionFlowState = {
  idempotencyKey: string;
  step: StoreAcquisitionStep;
};

export type AcquisitionFlowEvent =
  | { type: "acquisition-response"; response: StoreAcquisitionResponse }
  | { type: "checkout-response"; response: StoreCheckoutResponse }
  | { type: "reset-after-close" }
  | { type: "show-cart" }
  | { type: "show-details" };

export type AcquisitionFlowEffect =
  | { type: "clear-cart" }
  | { type: "open-checkout"; checkoutUrl: string }
  | { type: "reconcile-products"; availableProductSlugs: readonly string[] }
  | { type: "reset-form" }
  | { type: "reset-challenge" }
  | { type: "show-email-error"; message: string };

type EmailFieldErrorCode = Extract<
  StoreAcquisitionErrorCode,
  "email_subaddress_refused"
>;

const EMAIL_FIELD_ERROR_MESSAGES = {
  email_subaddress_refused: EMAIL_SUBADDRESS_REFUSED_MESSAGE,
} satisfies Record<EmailFieldErrorCode, string>;

const BOT_VERIFICATION_FAILED_MESSAGE =
  "We couldn't verify this request. Please try again.";
const IDEMPOTENCY_CONFLICT_MESSAGE =
  "This request changed while it was being sent. Please try again.";
const INVALID_REQUEST_MESSAGE =
  "Please review your email and consent choices, then try again.";
const CHECKOUT_UNAVAILABLE_MESSAGE =
  "Checkout is temporarily unavailable. Your cart and details are saved, so please try again shortly.";

export function reduceAcquisitionFlow(
  state: AcquisitionFlowState,
  event: AcquisitionFlowEvent,
  createIdempotencyKey: () => string,
): { effects: readonly AcquisitionFlowEffect[]; state: AcquisitionFlowState } {
  switch (event.type) {
    case "acquisition-response":
      return reduceAcquisitionResponse(
        state,
        event.response,
        createIdempotencyKey,
      );

    case "checkout-response":
      return reduceCheckoutResponse(
        state,
        event.response,
        createIdempotencyKey,
      );

    case "reset-after-close":
      return { effects: [], state: { ...state, step: "cart" } };

    case "show-cart":
      return { effects: [], state: { ...state, step: "cart" } };

    case "show-details":
      return { effects: [], state: { ...state, step: "details" } };
  }
}

export function resolveAcquisitionError(
  response: StoreAcquisitionResponse | null,
): string | null {
  if (!response || response.success || isEmailFieldError(response.error.code)) {
    return null;
  }

  const messages = {
    bot_verification_failed: BOT_VERIFICATION_FAILED_MESSAGE,
    delivery_unavailable:
      "We couldn't send your resources right now. Your cart is saved, so please try again.",
    delivery_retryable:
      "We couldn't confirm whether your resources were sent. Please retry this request.",
    idempotency_conflict: IDEMPOTENCY_CONFLICT_MESSAGE,
    invalid_request: INVALID_REQUEST_MESSAGE,
    paid_products:
      "We couldn't send your resources right now. Your cart is saved, so please try again.",
    rate_limited_cooldown:
      "Requests are limited to one per minute. Your selections are saved — please wait a moment and try again.",
    rate_limited_daily:
      "You've reached today's request limit. Your selections are saved — please try again later.",
    server_error:
      "We couldn't send your resources right now. Your cart is saved, so please try again.",
    unavailable_products:
      "One or more resources are no longer available. Your cart has been updated.",
  } satisfies Record<
    Exclude<StoreAcquisitionErrorCode, EmailFieldErrorCode>,
    string
  >;

  return messages[response.error.code];
}

export function resolveCheckoutError(
  response: StoreCheckoutResponse | null,
  products: readonly StoreProduct[],
): string | null {
  if (
    !response ||
    response.success ||
    response.error.code === "subaddress_refused"
  ) {
    return null;
  }

  if (response.error.code === "unavailable_products") {
    return unavailableProductsMessage(
      products,
      response.error.availableProductSlugs ?? [],
    );
  }

  const messages = {
    bot_verification_failed: BOT_VERIFICATION_FAILED_MESSAGE,
    checkout_unavailable: CHECKOUT_UNAVAILABLE_MESSAGE,
    idempotency_conflict: IDEMPOTENCY_CONFLICT_MESSAGE,
    invalid_request: INVALID_REQUEST_MESSAGE,
    no_paid_items: INVALID_REQUEST_MESSAGE,
  } satisfies Record<
    Exclude<
      StoreCheckoutErrorCode,
      "subaddress_refused" | "unavailable_products"
    >,
    string
  >;

  return messages[response.error.code];
}

function unavailableProductsMessage(
  products: readonly StoreProduct[],
  availableProductSlugs: readonly string[],
): string {
  const availableTitles = products
    .filter((product) => availableProductSlugs.includes(product.slug))
    .map((product) => product.title);

  if (availableTitles.length === 0) {
    return "The items in your cart are no longer available. Remove them to continue.";
  }

  return `Some items in your cart are no longer available. Still available: ${availableTitles.join(", ")}. Remove the rest to continue.`;
}

function reduceCheckoutResponse(
  state: AcquisitionFlowState,
  response: StoreCheckoutResponse,
  createIdempotencyKey: () => string,
): { effects: readonly AcquisitionFlowEffect[]; state: AcquisitionFlowState } {
  if (response.success) {
    return {
      effects: [
        { type: "open-checkout", checkoutUrl: response.checkoutUrl },
        { type: "reset-challenge" },
      ],
      state: { ...state, idempotencyKey: createIdempotencyKey() },
    };
  }

  const effects: AcquisitionFlowEffect[] = [];

  if (response.error.code === "subaddress_refused") {
    effects.push({
      type: "show-email-error",
      message: EMAIL_SUBADDRESS_REFUSED_MESSAGE,
    });
  }

  effects.push({ type: "reset-challenge" });

  return {
    effects,
    state: {
      idempotencyKey:
        response.error.code === "checkout_unavailable"
          ? state.idempotencyKey
          : createIdempotencyKey(),
      step:
        response.error.code === "unavailable_products" ? "cart" : state.step,
    },
  };
}

function reduceAcquisitionResponse(
  state: AcquisitionFlowState,
  response: StoreAcquisitionResponse,
  createIdempotencyKey: () => string,
): { effects: readonly AcquisitionFlowEffect[]; state: AcquisitionFlowState } {
  if (response.success) {
    return {
      effects: [
        { type: "clear-cart" },
        { type: "reset-form" },
        { type: "reset-challenge" },
      ],
      state: { idempotencyKey: createIdempotencyKey(), step: "success" },
    };
  }

  const effects: AcquisitionFlowEffect[] = [];
  let step = state.step;

  if (
    response.error.code === "unavailable_products" &&
    response.error.availableProductSlugs
  ) {
    effects.push({
      type: "reconcile-products",
      availableProductSlugs: response.error.availableProductSlugs,
    });
    step = "cart";
  }

  if (isEmailFieldError(response.error.code)) {
    effects.push({
      type: "show-email-error",
      message: EMAIL_FIELD_ERROR_MESSAGES[response.error.code],
    });
  }

  effects.push({ type: "reset-challenge" });

  return {
    effects,
    state: {
      idempotencyKey:
        response.error.code === "server_error"
          ? state.idempotencyKey
          : createIdempotencyKey(),
      step,
    },
  };
}

function isEmailFieldError(
  code: StoreAcquisitionErrorCode,
): code is EmailFieldErrorCode {
  return code in EMAIL_FIELD_ERROR_MESSAGES;
}
