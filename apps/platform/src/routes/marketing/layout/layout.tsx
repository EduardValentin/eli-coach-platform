import type { Waitlist } from "~/features/waitlist/contracts/waitlist";
import { Outlet, useLoaderData, useLocation } from "react-router";

import {
  useBotDetectionConfigQuery,
  type BotDetectionRuntimeState,
} from "@eli-coach-platform/infrastructure/bot-detection";

import { MarketingFooterCta } from "../footer-cta/footer-cta";
import type { WaitlistAvailabilityPresentationState } from "~/features/waitlist/ui/public/waitlist-availability-status";
import { useWaitlistQuery } from "~/features/waitlist/ui/public/waitlist-query";
import {
  StoreCartButton,
  StoreCartDrawer,
} from "../store/store-cart-drawer";
import { StoreCartProvider } from "../store/store-cart-provider";

import { PublicMarketingLayout } from "./public-marketing-layout";
import { loader } from "./layout.server";
import {
  resolveBotDetectionRuntimeState,
  resolveWaitlistAvailabilityPresentationState,
} from "./layout-state";

export { loader };

export type MarketingOutletContext = {
  botDetection: BotDetectionRuntimeState;
  waitlist: Waitlist;
  waitlistAvailabilityPresentationState: WaitlistAvailabilityPresentationState;
};

export default function MarketingLayoutRoute() {
  const { waitlist: initialWaitlist } = useLoaderData<typeof loader>();
  const location = useLocation();
  const isHomepage = location.pathname === "/";
  const scrollBehavior = isHomepage ? "hero-overlay" : "solid";
  const botDetectionQuery = useBotDetectionConfigQuery();
  const botDetection = resolveBotDetectionRuntimeState(botDetectionQuery);
  const waitlistQuery = useWaitlistQuery({
    initialWaitlist: initialWaitlist,
  });
  const waitlist = waitlistQuery.data;
  const waitlistAvailabilityPresentationState =
    resolveWaitlistAvailabilityPresentationState({
      hasFetchedRuntimeData: waitlistQuery.isFetchedAfterMount,
      waitlist,
    });
  const homepageFooterCta =
    isHomepage ? (
      <MarketingFooterCta
        botDetection={botDetection}
        waitlist={waitlist}
        waitlistAvailabilityPresentationState={waitlistAvailabilityPresentationState}
      />
    ) : undefined;

  return (
    <StoreCartProvider>
      <PublicMarketingLayout
        homepageFooterCta={homepageFooterCta}
        navigationActions={<StoreCartButton />}
        scrollBehavior={scrollBehavior}
        waitlist={waitlist}
      >
        <Outlet
          context={{
            botDetection,
            waitlist,
            waitlistAvailabilityPresentationState,
          } satisfies MarketingOutletContext}
        />
      </PublicMarketingLayout>
      <StoreCartDrawer botDetection={botDetection} />
    </StoreCartProvider>
  );
}
