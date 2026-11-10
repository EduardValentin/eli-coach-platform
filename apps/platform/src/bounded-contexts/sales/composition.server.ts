import type { MiddlewareFunction } from "react-router";

import { paymentsContext } from "~/bounded-contexts/sales/shared/payments/adapters/inbound/http/context.server";
import {
  composePayments,
  composePaymentsFeature,
} from "~/bounded-contexts/sales/shared/payments/composition.server";
import type { PaymentsConfig } from "~/bounded-contexts/sales/shared/payments/config.server";
import { storeContext } from "~/bounded-contexts/sales/store/adapters/inbound/http/context.server";
import {
  composeManagementAuth,
  composeStoreFeature,
  type StoreFeatureHandles,
} from "~/bounded-contexts/sales/store/composition.server";
import type { ManagementApiConfig } from "~/bounded-contexts/sales/store/config.server";
import { waitlistContext } from "~/bounded-contexts/sales/waitlist/adapters/inbound/http/context.server";
import { composeWaitlistFeature } from "~/bounded-contexts/sales/waitlist/composition.server";
import { subscriptionsContext } from "~/bounded-contexts/sales/subscriptions/adapters/inbound/http/context.server";
import {
  composeSubscriptionPayments,
  composeSubscriptionsFeature,
  type SubscriptionPaymentHandles,
  type SubscriptionsFeatureHandles,
} from "~/bounded-contexts/sales/subscriptions/composition.server";

type SalesHandles = Omit<
  StoreFeatureHandles &
    Parameters<typeof composeWaitlistFeature>[0] &
    SubscriptionsFeatureHandles,
  | "managementAuth"
  | "paymentProvider"
  | "pricingEligibilitySourceFacade"
  | keyof SubscriptionPaymentHandles
> & {
  managementApiConfig: ManagementApiConfig;
  paymentsConfig: PaymentsConfig;
};

export type SalesComposition = {
  middleware: MiddlewareFunction<Response>;
};

export function composeSales(handles: SalesHandles): SalesComposition {
  const payments = composePayments(handles.paymentsConfig);
  const store = composeStoreFeature({
    ...handles,
    managementAuth: composeManagementAuth(handles),
    paymentProvider: payments.paymentProvider,
  });
  const waitlist = composeWaitlistFeature(handles);
  const subscriptions = composeSubscriptionsFeature({
    ...handles,
    ...composeSubscriptionPayments({
      paymentProvider: payments.paymentProvider,
      paymentsConfig: handles.paymentsConfig,
    }),
    pricingEligibilitySourceFacade:
      waitlist.handles.pricingEligibilitySourceFacade,
  });
  const paymentsFeature = composePaymentsFeature({
    ...handles,
    ...payments,
    paymentCompletionHandlers: [
      subscriptions.paymentHandlers.paymentCompletionHandlerPort,
      store.paymentHandlers.paymentCompletionHandlerPort,
    ],
    paymentSubscriptionChangeHandlers: [
      subscriptions.paymentHandlers.paymentSubscriptionChangeHandlerPort,
    ],
    paymentRefundHandlers: [
      store.paymentHandlers.paymentRefundHandlerPort,
      subscriptions.paymentHandlers.paymentRefundHandlerPort,
    ],
    paymentCardHandlerPort:
      subscriptions.paymentHandlers.paymentCardHandlerPort,
  });

  return {
    middleware: ({ context }, next) => {
      context.set(storeContext, store.feature);
      context.set(waitlistContext, waitlist.feature);
      context.set(subscriptionsContext, subscriptions.feature);
      context.set(paymentsContext, paymentsFeature);
      return next();
    },
  };
}
