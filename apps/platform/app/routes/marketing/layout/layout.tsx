import type { RuntimeEnvironment } from "@eli-coach-platform/config";
import type { Waitlist } from "@eli-coach-platform/contracts";
import { Outlet, useLoaderData, useLocation } from "react-router";

import type { BotDetectionConfig } from "~/modules/bot-detection/bot-detection-contract";
import { createBotDetectionConfig } from "~/modules/bot-detection/bot-detection-config.server";
import { getRuntimeEnvironment } from "~/server/runtime-environment.server";

import { PublicMarketingLayout } from "./public-marketing-layout";
import { useWaitlistQuery } from "../waitlist/waitlist-query";

type MarketingLayoutLoaderData = {
  botDetectionConfig: BotDetectionConfig;
  waitlist: Waitlist;
};

export type MarketingOutletContext = {
  botDetectionConfig: BotDetectionConfig;
  waitlist: Waitlist;
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
    cap: runtimeEnvironment.WAITLIST_CAP,
    offer: {
      plan: runtimeEnvironment.WAITLIST_ACTIVE_OFFER_PLAN,
      slug: runtimeEnvironment.WAITLIST_ACTIVE_OFFER_SLUG,
    },
    spotsRemaining: null,
  };
}

export default function MarketingLayoutRoute() {
  const { botDetectionConfig, waitlist: initialWaitlist } = useLoaderData<typeof loader>();
  const location = useLocation();
  const scrollBehavior = location.pathname === "/" ? "hero-overlay" : "solid";
  const { data: waitlist } = useWaitlistQuery({
    initialWaitlist: initialWaitlist,
  });

  return (
    <PublicMarketingLayout scrollBehavior={scrollBehavior} waitlist={waitlist}>
      <Outlet context={{ botDetectionConfig, waitlist } satisfies MarketingOutletContext} />
    </PublicMarketingLayout>
  );
}
