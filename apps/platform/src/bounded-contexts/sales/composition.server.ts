import type { MiddlewareFunction } from "react-router";

import {
  storeContext,
  type StoreFeature,
} from "~/bounded-contexts/sales/store/adapters/inbound/http/context.server";
import {
  composeStoreFeature,
  type StoreFeatureHandles,
} from "~/bounded-contexts/sales/store/composition.server";
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
  type CoachingSalesFeatureHandles,
} from "~/bounded-contexts/sales/coaching-sales/composition.server";

export type SalesHandles = StoreFeatureHandles &
  Parameters<typeof composeWaitlistFeature>[0] &
  Omit<CoachingSalesFeatureHandles, "pricingEligibility">;

export type SalesComposition = {
  components: {
    coachingSales: CoachingSalesFeature;
    store: StoreFeature;
    waitlist: WaitlistFeature;
  };
  middleware: MiddlewareFunction<Response>;
};

export function composeSales(handles: SalesHandles): SalesComposition {
  const store = composeStoreFeature(handles);
  const waitlist = composeWaitlistFeature(handles);
  const coachingSales = composeCoachingSalesFeature({
    ...handles,
    pricingEligibility: waitlist.handles.pricingEligibility,
  });

  return {
    components: {
      coachingSales: coachingSales.feature,
      store,
      waitlist: waitlist.feature,
    },
    middleware: ({ context }, next) => {
      context.set(storeContext, store);
      context.set(waitlistContext, waitlist.feature);
      context.set(coachingSalesContext, coachingSales.feature);
      return next();
    },
  };
}
