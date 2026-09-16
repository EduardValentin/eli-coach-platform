import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";

import {
  STORE_ACQUISITION_TURNSTILE_ACTION,
  useBotDetectionSubmission,
  type BotDetectionConfig,
} from "@eli-coach-platform/infrastructure/bot-detection";
import {
  storeAcquisitionFormSchema,
  type StoreAcquisitionForm,
} from "~/features/store/contracts/store";

import {
  reduceAcquisitionFlow,
  resolveAcquisitionError,
  type AcquisitionFlowState,
} from "./acquisition-flow";
import type { StoreCartState } from "./cart";
import { useStoreAcquisitionFetcher } from "./api-client";

type UseStoreAcquisitionOptions = {
  botDetection: BotDetectionConfig;
  clearCart: StoreCartState["clearCart"];
  productSlugs: readonly string[];
  reconcileProducts: StoreCartState["reconcileProducts"];
};

export function useStoreAcquisition(
  options: UseStoreAcquisitionOptions,
) {
  const [flow, setFlow] = useState<AcquisitionFlowState>(() => ({
    idempotencyKey: createIdempotencyKey(),
    step: "cart",
  }));
  const flowRef = useRef(flow);
  flowRef.current = flow;
  const form = useForm<StoreAcquisitionForm>({
    defaultValues: {
      email: "",
      marketingConsent: false,
      termsAccepted: false,
    },
    resolver: zodResolver(storeAcquisitionFormSchema),
  });
  const { clearErrors, getValues, reset, watch } = form;
  const acquisition = useStoreAcquisitionFetcher();
  const { reset: resetAcquisition, response, submit: submitAcquisition } = acquisition;
  const botDetectionSubmission = useBotDetectionSubmission({
    action: STORE_ACQUISITION_TURNSTILE_ACTION,
    config: options.botDetection,
    onSubmitFormData: submitAcquisition,
  });
  const { resetChallenge } = botDetectionSubmission;
  const isSubmitting =
    acquisition.isSubmitting || botDetectionSubmission.isAwaitingChallenge;
  const email = watch("email");
  const termsAccepted = watch("termsAccepted");

  useEffect(() => {
    if (!response) {
      return;
    }

    const { effects, state } = reduceAcquisitionFlow(
      flowRef.current,
      { type: "response", response },
      createIdempotencyKey,
    );

    flowRef.current = state;
    setFlow(state);

    for (const effect of effects) {
      switch (effect.type) {
        case "clear-cart":
          options.clearCart();
          break;
        case "reconcile-products":
          options.reconcileProducts(effect.availableProductSlugs);
          break;
        case "reset-form":
          reset({
            email: getValues("email"),
            marketingConsent: false,
            termsAccepted: false,
          });
          break;
        case "reset-challenge":
          resetChallenge();
          break;
      }
    }
  }, [
    getValues,
    options.clearCart,
    options.reconcileProducts,
    reset,
    resetChallenge,
    response,
  ]);

  const submit: SubmitHandler<StoreAcquisitionForm> = (values) => {
    const formData = new FormData();
    formData.set("email", values.email);
    formData.set("idempotencyKey", flow.idempotencyKey);
    formData.set("marketingConsent", String(values.marketingConsent));
    formData.set("productSlugs", JSON.stringify(options.productSlugs));
    formData.set("termsAccepted", String(values.termsAccepted));
    botDetectionSubmission.submitFormData(formData);
  };

  return {
    botDetectionWidgetProps: botDetectionSubmission.botDetectionWidgetProps,
    canSubmit: !isSubmitting && email.trim().length > 0 && termsAccepted,
    form,
    isSubmitting,
    resetAfterDrawerClose: () => {
      setFlow(
        reduceAcquisitionFlow(
          flow,
          { type: "reset-after-close" },
          createIdempotencyKey,
        ).state,
      );
      clearErrors();
      resetAcquisition();
    },
    responseError:
      botDetectionSubmission.botDetectionError ?? resolveAcquisitionError(response),
    showCart: () => {
      setFlow(
        reduceAcquisitionFlow(flow, { type: "show-cart" }, createIdempotencyKey)
          .state,
      );
    },
    showDetails: () => {
      resetAcquisition();
      setFlow(
        reduceAcquisitionFlow(flow, { type: "show-details" }, createIdempotencyKey)
          .state,
      );
    },
    step: flow.step,
    submit,
  };
}

function createIdempotencyKey(): string {
  return globalThis.crypto.randomUUID();
}
