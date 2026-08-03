import type { RuntimeEnvironment } from "@eli-coach-platform/config";
import type { Waitlist } from "@eli-coach-platform/contracts";
import { Outlet, useLoaderData, useLocation } from "react-router";

import type { BotDetectionRuntimeState } from "~/modules/bot-detection/bot-detection-contract";
import { getRuntimeEnvironment } from "~/server/runtime-environment.server";

import { useBotDetectionConfigQuery } from "../bot-detection/bot-detection-query";
import { MarketingFooterCta } from "../footer-cta/footer-cta";
import type { WaitlistAvailabilityPresentationState } from "../waitlist/waitlist-availability-status";
import { useWaitlistQuery } from "../waitlist/waitlist-query";
import {
  StoreCartButton,
  StoreCartDrawer,
} from "../store/store-cart-drawer";
import { StoreCartProvider } from "../store/store-cart";

import { PublicMarketingLayout } from "./public-marketing-layout";

type MarketingLayoutLoaderData = {
  waitlist: Waitlist;
};

export type MarketingOutletContext = {
  botDetection: BotDetectionRuntimeState;
  waitlist: Waitlist;
  waitlistAvailabilityPresentationState: WaitlistAvailabilityPresentationState;
};

export async function loader(): Promise<MarketingLayoutLoaderData> {
  const runtimeEnvironment = getRuntimeEnvironment();

  return {
    waitlist: createStaticWaitlistShell(runtimeEnvironment),
  };
}

function createStaticWaitlistShell(runtimeEnvironment: RuntimeEnvironment): Waitlist {
  return {
    enabled: true,
    offer: {
      plan: runtimeEnvironment.WAITLIST_ACTIVE_OFFER_PLAN,
      campaignSlug: runtimeEnvironment.WAITLIST_ACTIVE_CAMPAIGN_SLUG,
    },
    availability: null,
  };
}

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

function resolveBotDetectionRuntimeState(
  query: ReturnType<typeof useBotDetectionConfigQuery>,
): BotDetectionRuntimeState {
  if (query.data) {
    return {
      config: query.data,
      status: "ready",
    };
  }

  return {
    config: null,
    status: query.isError ? "unavailable" : "loading",
  };
}

function resolveWaitlistAvailabilityPresentationState(options: {
  hasFetchedRuntimeData: boolean;
  waitlist: Waitlist;
}): WaitlistAvailabilityPresentationState {
  if (options.waitlist.availability !== null) {
    return "ready";
  }

  return options.hasFetchedRuntimeData ? "unavailable" : "loading";
}
