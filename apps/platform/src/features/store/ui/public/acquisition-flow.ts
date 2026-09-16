import type { StoreAcquisitionResponse } from "~/features/store/contracts/store";

export type StoreAcquisitionStep = "cart" | "details" | "success";

export type AcquisitionFlowState = {
  idempotencyKey: string;
  step: StoreAcquisitionStep;
};

export type AcquisitionFlowEvent =
  | { type: "response"; response: StoreAcquisitionResponse }
  | { type: "reset-after-close" }
  | { type: "show-cart" }
  | { type: "show-details" };

export type AcquisitionFlowEffect =
  | { type: "clear-cart" }
  | { type: "reconcile-products"; availableProductSlugs: readonly string[] }
  | { type: "reset-form" }
  | { type: "reset-challenge" };

export function reduceAcquisitionFlow(
  state: AcquisitionFlowState,
  event: AcquisitionFlowEvent,
  createIdempotencyKey: () => string,
): { effects: readonly AcquisitionFlowEffect[]; state: AcquisitionFlowState } {
  switch (event.type) {
    case "response":
      return reduceResponse(state, event.response, createIdempotencyKey);

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
  if (!response || response.success) {
    return null;
  }

  const messages = {
    bot_verification_failed:
      "We couldn't verify this request. Please try again.",
    delivery_unavailable:
      "We couldn't send your resources right now. Your cart is saved, so please try again.",
    delivery_retryable:
      "We couldn't confirm whether your resources were sent. Please retry this request.",
    idempotency_conflict:
      "This request changed while it was being sent. Please try again.",
    invalid_request:
      "Please review your email and consent choices, then try again.",
    rate_limited_cooldown:
      "Requests are limited to one per minute. Your selections are saved — please wait a moment and try again.",
    rate_limited_daily:
      "You've reached today's request limit. Your selections are saved — please try again later.",
    server_error:
      "We couldn't send your resources right now. Your cart is saved, so please try again.",
    unavailable_products:
      "One or more resources are no longer available. Your cart has been updated.",
  } satisfies Record<
    Exclude<StoreAcquisitionResponse, { success: true }>[
      "error"
    ]["code"],
    string
  >;

  return messages[response.error.code];
}

function reduceResponse(
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
