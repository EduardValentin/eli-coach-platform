import {
  resolvePublicLaunchModeFromFeatureFlags,
  type PublicLaunchMode,
} from "@eli-coach-platform/domain";
import { Outlet, useLoaderData, useLocation } from "react-router";

import { getPlatformContainer } from "~/server/container.server";

import { PublicMarketingLayout } from "./public-marketing-layout";

type MarketingLayoutLoaderData = {
  launchMode: PublicLaunchMode;
};

export async function loader(): Promise<MarketingLayoutLoaderData> {
  return {
    launchMode: await loadPublicLaunchMode(),
  };
}

async function loadPublicLaunchMode(): Promise<PublicLaunchMode> {
  return resolvePublicLaunchModeFromFeatureFlags({
    readFeatureFlags: () => getPlatformContainer().featureFlagService.getFeatureFlags({}),
  });
}

export default function MarketingLayoutRoute() {
  const { launchMode } = useLoaderData<typeof loader>();
  const location = useLocation();
  const scrollBehavior = location.pathname === "/" ? "hero-overlay" : "solid";

  return (
    <PublicMarketingLayout launchMode={launchMode} scrollBehavior={scrollBehavior}>
      <Outlet />
    </PublicMarketingLayout>
  );
}
