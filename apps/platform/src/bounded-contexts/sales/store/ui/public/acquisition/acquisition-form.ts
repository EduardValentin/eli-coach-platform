import { zodResolver } from "@hookform/resolvers/zod";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";

import {
  STORE_ACQUISITION_TURNSTILE_ACTION,
  useBotDetectionSubmission,
  type BotDetectionConfig,
} from "~/shared/submission-checks/bot-detection";
import {
  storeAcquisitionFormSchema,
  type StoreProduct,
} from "~/bounded-contexts/sales/store/public/store";

import {
  reduceAcquisitionFlow,
  resolveAcquisitionError,
  resolveCheckoutError,
  type AcquisitionFlowEffect,
  type AcquisitionFlowEvent,
  type AcquisitionFlowState,
} from "./acquisition-flow";
import type { StoreCheckoutDetails } from "../cart/cart-storage";
import { useStoreCart } from "../cart/cart-provider";
import {
  useStoreAcquisitionFetcher,
  useStoreCheckoutFetcher,
} from "../api-client";

const storeCartDetailsFormSchema = storeAcquisitionFormSchema.extend({
  deliveryConsent: z.boolean(),
});

type UseStoreAcquisitionOptions = {
  botDetection: BotDetectionConfig;
  products: readonly StoreProduct[];
};

export function useStoreAcquisition(options: UseStoreAcquisitionOptions) {
  const clearCart = useStoreCart((cart) => cart.clearCart);
  const currency = useStoreCart((cart) => cart.currency);
  const isCartHydrated = useStoreCart((cart) => cart.isHydrated);
  const notice = useStoreCart((cart) => cart.notice);
  const productSlugs = useStoreCart((cart) => cart.productSlugs);
  const reconcileProducts = useStoreCart((cart) => cart.reconcileProducts);
  const rememberCheckoutDetails = useStoreCart(
    (cart) => cart.rememberCheckoutDetails,
  );
  const takeCheckoutDetails = useStoreCart((cart) => cart.takeCheckoutDetails);
  const [flow, setFlow] = useState<AcquisitionFlowState>(() => ({
    idempotencyKey: createIdempotencyKey(),
    step: "cart",
  }));
  const [isOpeningCheckout, setIsOpeningCheckout] = useState(false);
  const flowRef = useRef(flow);
  flowRef.current = flow;
  const form = useForm<StoreCheckoutDetails>({
    defaultValues: {
      deliveryConsent: false,
      email: "",
      marketingConsent: false,
      termsAccepted: false,
    },
    resolver: zodResolver(storeCartDetailsFormSchema),
  });
  const { clearErrors, getValues, reset, setError, watch } = form;
  const acquisition = useStoreAcquisitionFetcher();
  const checkout = useStoreCheckoutFetcher();
  const isPaidCheckout = options.products.some(
    (product) => product.price !== null,
  );
  const submitFormDataRef = useRef(acquisition.submit);
  const submitFormData = useCallback(
    (formData: FormData) => submitFormDataRef.current(formData),
    [],
  );
  const botDetectionSubmission = useBotDetectionSubmission({
    action: STORE_ACQUISITION_TURNSTILE_ACTION,
    config: options.botDetection,
    onSubmitFormData: submitFormData,
  });
  const { resetChallenge } = botDetectionSubmission;
  const isSubmitting =
    acquisition.isSubmitting ||
    checkout.isSubmitting ||
    isOpeningCheckout ||
    botDetectionSubmission.isAwaitingChallenge;
  const email = watch("email");
  const termsAccepted = watch("termsAccepted");
  const deliveryConsent = watch("deliveryConsent");

  const applyFlowEvent = useEffectEvent((event: AcquisitionFlowEvent) => {
    const { effects, state } = reduceAcquisitionFlow(
      flowRef.current,
      event,
      createIdempotencyKey,
    );

    flowRef.current = state;
    setFlow(state);

    for (const effect of effects) {
      applyEffect(effect);
    }
  });

  function applyEffect(effect: AcquisitionFlowEffect) {
    switch (effect.type) {
      case "clear-cart":
        clearCart();
        break;
      case "open-checkout":
        rememberCheckoutDetails(getValues());
        setIsOpeningCheckout(true);
        window.location.assign(effect.checkoutUrl);
        break;
      case "reconcile-products":
        reconcileProducts(effect.availableProductSlugs);
        break;
      case "reset-form":
        reset({
          deliveryConsent: false,
          email: getValues("email"),
          marketingConsent: false,
          termsAccepted: false,
        });
        break;
      case "reset-challenge":
        resetChallenge();
        break;
      case "show-email-error":
        setError("email", { message: effect.message }, { shouldFocus: true });
        break;
    }
  }

  useEffect(() => {
    if (acquisition.response) {
      applyFlowEvent({ type: "response", response: acquisition.response });
    }
  }, [acquisition.response]);

  useEffect(() => {
    if (checkout.response) {
      applyFlowEvent({
        type: "checkout-response",
        response: checkout.response,
      });
    }
  }, [checkout.response]);

  useEffect(() => {
    if (notice !== "payment-not-completed" || !isCartHydrated) {
      return;
    }

    const rememberedDetails = takeCheckoutDetails();

    if (rememberedDetails) {
      reset(rememberedDetails);
    }
  }, [isCartHydrated, notice, reset, takeCheckoutDetails]);

  useEffect(() => {
    const leaveOpeningState = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setIsOpeningCheckout(false);
      }
    };

    window.addEventListener("pageshow", leaveOpeningState);

    return () => window.removeEventListener("pageshow", leaveOpeningState);
  }, []);

  const submit: SubmitHandler<StoreCheckoutDetails> = (values) => {
    const formData = new FormData();
    formData.set("email", values.email);
    formData.set("idempotencyKey", flow.idempotencyKey);
    formData.set("marketingConsent", String(values.marketingConsent));
    formData.set("productSlugs", JSON.stringify(productSlugs));
    formData.set("termsAccepted", String(values.termsAccepted));

    if (!isPaidCheckout) {
      submitFormDataRef.current = acquisition.submit;
      botDetectionSubmission.submitFormData(formData);
      return;
    }

    if (!values.deliveryConsent) {
      return;
    }

    formData.set("currency", currency);
    formData.set("deliveryConsent", String(values.deliveryConsent));
    submitFormDataRef.current = checkout.submit;
    botDetectionSubmission.submitFormData(formData);
  };

  return {
    botDetectionWidgetProps: botDetectionSubmission.botDetectionWidgetProps,
    canContinueToPayment:
      email.trim().length > 0 && termsAccepted && deliveryConsent,
    canSubmit: !isSubmitting && email.trim().length > 0 && termsAccepted,
    form,
    isPaidCheckout,
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
      acquisition.reset();
      checkout.reset();
    },
    responseError:
      botDetectionSubmission.botDetectionError ??
      resolveAcquisitionError(acquisition.response) ??
      resolveCheckoutError(checkout.response, options.products),
    showCart: () => {
      setFlow(
        reduceAcquisitionFlow(flow, { type: "show-cart" }, createIdempotencyKey)
          .state,
      );
    },
    showDetails: () => {
      acquisition.reset();
      checkout.reset();
      setFlow(
        reduceAcquisitionFlow(
          flow,
          { type: "show-details" },
          createIdempotencyKey,
        ).state,
      );
    },
    step: flow.step,
    submit,
  };
}

function createIdempotencyKey(): string {
  return globalThis.crypto.randomUUID();
}
