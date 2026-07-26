import type { RuntimeEnvironment } from "@eli-coach-platform/config";
import type { Waitlist } from "@eli-coach-platform/contracts";
import { Outlet, useLoaderData, useLocation } from "react-router";

import type { BotDetectionConfig } from "~/modules/bot-detection/bot-detection-contract";
import { createBotDetectionConfig } from "~/modules/bot-detection/bot-detection-config.server";
import { getRuntimeEnvironment } from "~/server/runtime-environment.server";

import { MarketingFooterCta } from "../footer-cta/footer-cta";
import type { WaitlistAvailabilityPresentationState } from "../waitlist/waitlist-availability-status";
import { useWaitlistQuery } from "../waitlist/waitlist-query";

import { PublicMarketingLayout } from "./public-marketing-layout";

type MarketingLayoutLoaderData = {
  botDetectionConfig: BotDetectionConfig;
  waitlist: Waitlist;
};

export type MarketingOutletContext = {
  botDetectionConfig: BotDetectionConfig;
  waitlist: Waitlist;
  waitlistAvailabilityPresentationState: WaitlistAvailabilityPresentationState;
};

export async function loader(): Promise<MarketingLayoutLoaderData> {
  const runtimeEnvironment = getRuntimeEnvironment();

  return {
    botDetectionConfig: createBotDetectionConfig(runtimeEnvironment),
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
  const { botDetectionConfig, waitlist: initialWaitlist } = useLoaderData<typeof loader>();
  const location = useLocation();
  const scrollBehavior = location.pathname === "/" ? "hero-overlay" : "solid";
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
    location.pathname === "/" ? (
      <MarketingFooterCta
        botDetectionConfig={botDetectionConfig}
        waitlist={waitlist}
        waitlistAvailabilityPresentationState={waitlistAvailabilityPresentationState}
      />
    ) : undefined;

  return (
    <PublicMarketingLayout
      homepageFooterCta={homepageFooterCta}
      scrollBehavior={scrollBehavior}
      waitlist={waitlist}
    >
      <Outlet
        context={{
          botDetectionConfig,
          waitlist,
          waitlistAvailabilityPresentationState,
        } satisfies MarketingOutletContext}
      />
    </PublicMarketingLayout>
  );
}

function resolveWaitlistAvailabilityPresentationState(options: {
  hasFetchedRuntimeData: boolean;
  waitlist: Waitlist;
}): WaitlistAvailabilityPresentationState {
  if (!options.hasFetchedRuntimeData && options.waitlist.availability === null) {
    return "loading";
  }

  if (options.waitlist.enabled && options.waitlist.availability === null) {
    return "unavailable";
  }

  return "ready";
}
