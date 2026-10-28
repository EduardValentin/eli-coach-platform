import type { MiddlewareFunction } from "react-router";

import {
  storeContext,
  type StoreFeature,
} from "~/bounded-contexts/sales/store/adapters/inbound/http/context.server";
import {
  composeManagementAuth,
  composeStoreFeature,
  type StoreFeatureHandles,
} from "~/bounded-contexts/sales/store/composition.server";
import type { ManagementApiConfig } from "~/bounded-contexts/sales/store/config.server";
import {
  waitlistContext,
  type WaitlistFeature,
} from "~/bounded-contexts/sales/waitlist/adapters/inbound/http/context.server";
import { composeWaitlistFeature } from "~/bounded-contexts/sales/waitlist/composition.server";
import {
  coachingSalesContext,
  type CoachingSalesFeature,
} from "~/bounded-contexts/sales/coaching-sales/adapters/inbound/http/context.server";
import {
  composeCoachingSalesFeature,
  composePayments,
  type CoachingSalesFeatureHandles,
} from "~/bounded-contexts/sales/coaching-sales/composition.server";
import type { PaymentsConfig } from "~/bounded-contexts/sales/coaching-sales/config.server";

type SalesHandles = Omit<
  StoreFeatureHandles &
    Parameters<typeof composeWaitlistFeature>[0] &
    CoachingSalesFeatureHandles,
  | "managementAuth"
  | "pricingEligibility"
  | keyof ReturnType<typeof composePayments>
> & {
  managementApiConfig: ManagementApiConfig;
  paymentsConfig: PaymentsConfig;
};

export type SalesComposition = {
  middleware: MiddlewareFunction<Response>;
};

export function composeSales(handles: SalesHandles): SalesComposition {
  const store = composeStoreFeature({
    ...handles,
    managementAuth: composeManagementAuth(handles),
  });
  const waitlist = composeWaitlistFeature(handles);
  const coachingSales = composeCoachingSalesFeature({
    ...handles,
    ...composePayments(handles.paymentsConfig),
    pricingEligibility: waitlist.handles.pricingEligibility,
  });

  return {
    middleware: ({ context }, next) => {
      context.set(storeContext, store);
      context.set(waitlistContext, waitlist.feature);
      context.set(coachingSalesContext, coachingSales.feature);
      return next();
    },
  };
}
