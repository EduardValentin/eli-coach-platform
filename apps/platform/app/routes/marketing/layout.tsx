import type { WaitingListLaunchMode } from "@eli-coach-platform/domain";
import { Outlet, useLoaderData, useLocation } from "react-router";

import { getPlatformContainer } from "~/server/container.server";

import { PublicMarketingLayout } from "./public-marketing-layout";

type MarketingLayoutLoaderData = {
  launchMode: WaitingListLaunchMode;
};

export async function loader(): Promise<MarketingLayoutLoaderData> {
  return {
    launchMode: await loadPublicLaunchMode(),
  };
}

async function loadPublicLaunchMode(): Promise<WaitingListLaunchMode> {
  return getPlatformContainer().waitingListService.getLaunchMode();
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
