import type { Waitlist } from "@eli-coach-platform/domain";
import { Outlet, useLoaderData, useLocation } from "react-router";

import { getPlatformContainer } from "~/server/container.server";

import { PublicMarketingLayout } from "./public-marketing-layout";

type MarketingLayoutLoaderData = {
  waitlist: Waitlist;
};

export async function loader(): Promise<MarketingLayoutLoaderData> {
  return {
    waitlist: await loadPublicWaitlist(),
  };
}

async function loadPublicWaitlist(): Promise<Waitlist> {
  try {
    return await getPlatformContainer().waitingListService.getWaitlist();
  } catch {
    return {
      enabled: true,
      prospects: [],
    };
  }
}

export default function MarketingLayoutRoute() {
  const { waitlist } = useLoaderData<typeof loader>();
  const location = useLocation();
  const scrollBehavior = location.pathname === "/" ? "hero-overlay" : "solid";

  return (
    <PublicMarketingLayout scrollBehavior={scrollBehavior} waitlist={waitlist}>
      <Outlet />
    </PublicMarketingLayout>
  );
}
