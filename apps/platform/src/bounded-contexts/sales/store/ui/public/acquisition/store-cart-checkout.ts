import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  type SubmitHandler,
  type UseFormReset,
  useForm,
} from "react-hook-form";

import {
  STORE_ACQUISITION_TURNSTILE_ACTION,
  useBotDetectionSubmission,
  type BotDetectionConfig,
} from "~/shared/submission-checks/bot-detection";
import type { StoreProduct } from "~/bounded-contexts/sales/store/public/store";

import {
  reduceAcquisitionFlow,
  resolveAcquisitionError,
  resolveCheckoutError,
  type AcquisitionFlowEffect,
  type AcquisitionFlowEvent,
  type AcquisitionFlowState,
} from "./acquisition-flow";
import {
  storeCheckoutDetailsFormSchema,
  type StoreCheckoutDetails,
} from "./store-checkout-details";
import { useStoreCart } from "../cart/cart-provider";
import {
  useStoreAcquisitionFetcher,
  useStoreCheckoutFetcher,
} from "../api-client";

type UseStoreCartCheckoutOptions = {
  botDetection: BotDetectionConfig;
  products: readonly StoreProduct[];
};

const EMPTY_CHECKOUT_DETAILS: StoreCheckoutDetails = {
  deliveryConsent: false,
  email: "",
  marketingConsent: false,
  termsAccepted: false,
};

export function useStoreCartCheckout(options: UseStoreCartCheckoutOptions) {
  const clearCart = useStoreCart((cart) => cart.clearCart);
  const currency = useStoreCart((cart) => cart.currency);
  const productSlugs = useStoreCart((cart) => cart.productSlugs);
  const reconcileProducts = useStoreCart((cart) => cart.reconcileProducts);
  const rememberCheckoutDetails = useStoreCart(
    (cart) => cart.rememberCheckoutDetails,
  );
  const [flow, setFlow] = useState<AcquisitionFlowState>(() => ({
    idempotencyKey: createIdempotencyKey(),
    step: "cart",
  }));
  const flowRef = useRef(flow);
  flowRef.current = flow;
  const form = useForm<StoreCheckoutDetails>({
    defaultValues: EMPTY_CHECKOUT_DETAILS,
    resolver: zodResolver(storeCheckoutDetailsFormSchema),
  });
  const { clearErrors, getValues, reset, setError, watch } = form;
  const openingCheckout = useOpeningCheckoutState();
  useRememberedCheckoutDetails(reset);
  const acquisition = useStoreAcquisitionFetcher();
  const checkout = useStoreCheckoutFetcher();
  const isPaidCheckout = options.products.some(
    (product) => product.price !== null,
  );
  const botDetectionSubmission = useBotDetectionSubmission({
    action: STORE_ACQUISITION_TURNSTILE_ACTION,
    config: options.botDetection,
    onSubmitFormData: isPaidCheckout ? checkout.submit : acquisition.submit,
  });
  const { resetChallenge } = botDetectionSubmission;
  const isSubmitting =
    acquisition.isSubmitting ||
    checkout.isSubmitting ||
    openingCheckout.isOpeningCheckout ||
    botDetectionSubmission.isAwaitingChallenge;
  const hasEmail = watch("email").trim().length > 0;
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
        openingCheckout.openCheckout(effect.checkoutUrl);
        break;
      case "reconcile-products":
        reconcileProducts(effect.availableProductSlugs);
        break;
      case "reset-form":
        reset({ ...EMPTY_CHECKOUT_DETAILS, email: getValues("email") });
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
      applyFlowEvent({
        type: "acquisition-response",
        response: acquisition.response,
      });
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

  function cartFormData(values: StoreCheckoutDetails): FormData {
    const formData = new FormData();
    formData.set("email", values.email);
    formData.set("idempotencyKey", flow.idempotencyKey);
    formData.set("marketingConsent", String(values.marketingConsent));
    formData.set("productSlugs", JSON.stringify(productSlugs));
    formData.set("termsAccepted", String(values.termsAccepted));

    return formData;
  }

  const submitFreeClaim: SubmitHandler<StoreCheckoutDetails> = (values) => {
    botDetectionSubmission.submitFormData(cartFormData(values));
  };

  const submitPaidCheckout: SubmitHandler<StoreCheckoutDetails> = (values) => {
    if (!values.deliveryConsent) {
      return;
    }

    const formData = cartFormData(values);
    formData.set("currency", currency);
    formData.set("deliveryConsent", String(values.deliveryConsent));
    botDetectionSubmission.submitFormData(formData);
  };

  return {
    botDetectionWidgetProps: botDetectionSubmission.botDetectionWidgetProps,
    canContinueToPayment: hasEmail && termsAccepted && deliveryConsent,
    canSubmitFreeClaim: !isSubmitting && hasEmail && termsAccepted,
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
    submitFreeClaim,
    submitPaidCheckout,
  };
}

function useRememberedCheckoutDetails(
  reset: UseFormReset<StoreCheckoutDetails>,
) {
  const isCartHydrated = useStoreCart((cart) => cart.isHydrated);
  const notice = useStoreCart((cart) => cart.notice);
  const takeCheckoutDetails = useStoreCart((cart) => cart.takeCheckoutDetails);

  useEffect(() => {
    if (notice !== "payment-not-completed" || !isCartHydrated) {
      return;
    }

    const rememberedDetails = takeCheckoutDetails();

    if (rememberedDetails) {
      reset(rememberedDetails);
    }
  }, [isCartHydrated, notice, reset, takeCheckoutDetails]);
}

function useOpeningCheckoutState() {
  const [isOpeningCheckout, setIsOpeningCheckout] = useState(false);

  useEffect(() => {
    const leaveOpeningState = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setIsOpeningCheckout(false);
      }
    };

    window.addEventListener("pageshow", leaveOpeningState);

    return () => window.removeEventListener("pageshow", leaveOpeningState);
  }, []);

  return {
    isOpeningCheckout,
    openCheckout: (checkoutUrl: string) => {
      setIsOpeningCheckout(true);
      window.location.assign(checkoutUrl);
    },
  };
}

function createIdempotencyKey(): string {
  return globalThis.crypto.randomUUID();
}
