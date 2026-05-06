import { joinBasePath, type RuntimeEnvironment } from "@eli-coach-platform/config";
import type { WaitlistSnapshot } from "@eli-coach-platform/contracts";
import { Outlet, useLoaderData, useLocation } from "react-router";

import type { BotDetectionConfig } from "~/modules/bot-detection/bot-detection-contract";
import { createBotDetectionConfig } from "~/modules/bot-detection/bot-detection-config.server";
import { getRuntimeEnvironment } from "~/server/runtime-environment.server";

import { PublicMarketingLayout } from "./public-marketing-layout";
import { WAITLIST_API_PATH } from "../waitlist/waitlist-client";
import { useWaitlistSnapshotQuery } from "../waitlist/waitlist-query";

type MarketingLayoutLoaderData = {
  botDetectionConfig: BotDetectionConfig;
  waitlist: WaitlistSnapshot;
};

export type MarketingOutletContext = {
  botDetectionConfig: BotDetectionConfig;
  waitlist: WaitlistSnapshot;
};

export async function loader(): Promise<MarketingLayoutLoaderData> {
  const runtimeEnvironment = getRuntimeEnvironment();

  return {
    botDetectionConfig: createBotDetectionConfig(runtimeEnvironment),
    waitlist: createStaticWaitlistShell(runtimeEnvironment),
  };
}

function createStaticWaitlistShell(runtimeEnvironment: RuntimeEnvironment): WaitlistSnapshot {
  return {
    enabled: true,
    cap: runtimeEnvironment.WAITLIST_CAP,
    spotsRemaining: null,
  };
}

export default function MarketingLayoutRoute() {
  const { botDetectionConfig, waitlist: initialWaitlist } = useLoaderData<typeof loader>();
  const location = useLocation();
  const scrollBehavior = location.pathname === "/" ? "hero-overlay" : "solid";
  const waitlistApiUrl = joinBasePath(import.meta.env.BASE_URL, WAITLIST_API_PATH);
  const { data: waitlist } = useWaitlistSnapshotQuery({
    initialSnapshot: initialWaitlist,
    waitlistApiUrl,
  });

  return (
    <PublicMarketingLayout scrollBehavior={scrollBehavior} waitlist={waitlist}>
      <Outlet context={{ botDetectionConfig, waitlist } satisfies MarketingOutletContext} />
    </PublicMarketingLayout>
  );
}
