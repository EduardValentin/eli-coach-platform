import type { Waitlist } from "@eli-coach-platform/domain";
import { Outlet, useLoaderData, useLocation } from "react-router";

import { getPlatformContainer } from "~/server/container.server";
import { getRuntimeEnvironment } from "~/server/runtime-environment.server";

import { PublicMarketingLayout } from "./public-marketing-layout";

type MarketingLayoutLoaderData = {
  waitlist: Waitlist;
};

export type MarketingOutletContext = {
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
    const runtimeEnvironment = getRuntimeEnvironment();

    return {
      enabled: true,
      cap: runtimeEnvironment.WAITLIST_CAP,
      spotsRemaining: null,
    };
  }
}

export default function MarketingLayoutRoute() {
  const { waitlist } = useLoaderData<typeof loader>();
  const location = useLocation();
  const scrollBehavior = location.pathname === "/" ? "hero-overlay" : "solid";

  return (
    <PublicMarketingLayout scrollBehavior={scrollBehavior} waitlist={waitlist}>
      <Outlet context={{ waitlist } satisfies MarketingOutletContext} />
    </PublicMarketingLayout>
  );
}
