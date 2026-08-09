import {
  storeAcquisitionFormSchema,
  type StoreAcquisitionForm,
  type StoreAcquisitionResponse,
} from "@eli-coach-platform/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";

import {
  STORE_ACQUISITION_TURNSTILE_ACTION,
  type BotDetectionRuntimeState,
} from "~/modules/bot-detection/bot-detection-contract";
import { useBotDetectionSubmission } from "~/modules/bot-detection/use-bot-detection-submission";

import type { StoreCartState } from "./store-cart";
import { useStoreAcquisitionMutation } from "./store-api";

export type StoreAcquisitionStep = "cart" | "details" | "success";

type UseStoreAcquisitionOptions = {
  botDetection: BotDetectionRuntimeState;
  clearCart: StoreCartState["clearCart"];
  productSlugs: readonly string[];
  reconcileProducts: StoreCartState["reconcileProducts"];
};

export function useStoreAcquisition(
  options: UseStoreAcquisitionOptions,
) {
  const [step, setStep] = useState<StoreAcquisitionStep>("cart");
  const [idempotencyKey, setIdempotencyKey] = useState(
    createIdempotencyKey,
  );
  const form = useForm<StoreAcquisitionForm>({
    defaultValues: {
      email: "",
      marketingConsent: false,
      termsAccepted: false,
    },
    resolver: zodResolver(storeAcquisitionFormSchema),
  });
  const { clearErrors, getValues, reset } = form;
  const mutation = useStoreAcquisitionMutation();
  const { mutate } = mutation;
  const botDetectionSubmission = useBotDetectionSubmission({
    action: STORE_ACQUISITION_TURNSTILE_ACTION,
    botDetection: options.botDetection,
    onSubmitFormData: mutate,
  });
  const { resetChallenge } = botDetectionSubmission;

  useEffect(() => {
    const response = mutation.data;

    if (!response) {
      return;
    }

    if (response.success) {
      options.clearCart();
      setIdempotencyKey(createIdempotencyKey());
      reset({
        email: getValues("email"),
        marketingConsent: false,
        termsAccepted: false,
      });
      resetChallenge();
      setStep("success");
      return;
    }

    if (
      response.error.code === "unavailable_products" &&
      response.error.availableProductSlugs
    ) {
      options.reconcileProducts(response.error.availableProductSlugs);
      setStep("cart");
    }

    if (response.error.code !== "server_error") {
      setIdempotencyKey(createIdempotencyKey());
    }

    resetChallenge();
  }, [
    getValues,
    mutation.data,
    options.clearCart,
    options.reconcileProducts,
    reset,
    resetChallenge,
  ]);

  const submit: SubmitHandler<StoreAcquisitionForm> = (values) => {
    mutation.reset();
    const formData = new FormData();
    formData.set("email", values.email);
    formData.set("idempotencyKey", idempotencyKey);
    formData.set("marketingConsent", String(values.marketingConsent));
    formData.set("productSlugs", JSON.stringify(options.productSlugs));
    formData.set("termsAccepted", String(values.termsAccepted));
    botDetectionSubmission.submitFormData(formData);
  };

  return {
    botDetectionIsReady: botDetectionSubmission.botDetectionIsReady,
    botDetectionWidgetProps:
      botDetectionSubmission.botDetectionWidgetProps,
    form,
    isSubmitting:
      mutation.isPending || botDetectionSubmission.isAwaitingChallenge,
    resetAfterDrawerClose: () => {
      setStep("cart");
      clearErrors();
      mutation.reset();
    },
    responseError:
      botDetectionSubmission.botDetectionError ??
      resolveAcquisitionError(mutation.data),
    showCart: () => setStep("cart"),
    showDetails: () => {
      mutation.reset();
      setStep("details");
    },
    step,
    submit,
  };
}

function resolveAcquisitionError(
  response: StoreAcquisitionResponse | undefined,
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

function createIdempotencyKey(): string {
  return globalThis.crypto.randomUUID();
}
